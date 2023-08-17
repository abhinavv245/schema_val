const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const {convertExcelToJson} = require('./excelToJson')

const ajv = new Ajv({
  allErrors: true,
  strict: "log",
  strictRequired: false,
  strictTypes: false,
  verbose: true,
  $data: true,
});
addFormats(ajv);
const schemasDirectory = path.join(__dirname, "./schema");

const excelFilePath = path.join(__dirname, './excel/On Status resposes.xlsx'); // Provide the actual file path
const outputFolder = path.join(__dirname, './payload'); // Provide the folder where you want to save JSON files

try {
    convertExcelToJson(excelFilePath,outputFolder)
} catch (error) {
    console.log(error)
}
const formatted_error = (errors) => {
    error_list = [];
    let status = "";
    errors.forEach((error) => {
      if (
        !["not", "oneOf", "anyOf", "allOf", "if", "then", "else"].includes(
          error.keyword
        )
      ) {
        error_dict = {
          message: `${error.message}${
            error.params.allowedValues ? ` (${error.params.allowedValues})` : ""
          }${error.params.allowedValue ? ` (${error.params.allowedValue})` : ""}${
            error.params.additionalProperty
              ? ` (${error.params.additionalProperty})`
              : ""
          }`,
          details: error.instancePath,
        };
        error_list.push(error_dict);
      }
    });
    if (error_list.length === 0) status = "pass";
    else status = "fail";
    error_json = { errors: error_list, status: status };
    return error_json;
  };
function readPayloads(directoryPath) {
  return fs
    .readdirSync(directoryPath)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(directoryPath, file))));
}

// Function to load schema files based on context action
function loadSchema(action) {
  try {
    const schemaFilePath = path.join(schemasDirectory, `${action}.js`);
    const schema = require(schemaFilePath);
    return schema;
  } catch (error) {
    console.error(`Error loading schema for action '${action}':`, error);
    return null;
  }
}
// Function to validate payloads against the corresponding schema
function validatePayloads(data, schema) {
  let error_list = [];
  validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    error_list = validate.errors;
  }
  return error_list;
}
function validatePayloadsRecursive(directoryPath) {
  const payloadFilesData = readPayloads(directoryPath);
  const payloadsByAction = payloadFilesData.reduce((acc, payload) => {
    const action = payload.context.action;
    if (!acc[action]) {
      acc[action] = [];
    }
    acc[action].push(payload);
    return acc;
  }, {});

  const validationResults = {};

  for (const action in payloadsByAction) {
    const payloads = payloadsByAction[action];
    const schema = loadSchema(action);

    payloads.forEach((payload) => {
      const transaction_id = payload?.context?.transaction_id;
      if (schema) {
        validationResults[transaction_id] = formatted_error(
          validatePayloads(payload, schema)
        );
      }
    });
  }

  return validationResults;
}

// Main function to start the validation process and write results to a file
function validateAndWriteResults(mainDirectory, outputFilePath) {
  const validationResults = validatePayloadsRecursive(mainDirectory);

  const jsonData = JSON.stringify(validationResults, null, 2);

  fs.writeFileSync(outputFilePath, jsonData, (err) => {
    if (err) {
      console.error("Error writing validation results to file:", err);
    } else {
      console.log("Validation results written to", outputFilePath);
    }
  });
}

const mainDirectory = path.join(__dirname, "./payload");
const outputFilePath = "./validation_results.json";

validateAndWriteResults(mainDirectory, outputFilePath);
