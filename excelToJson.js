const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');



const convertExcelToJson = (excelFilePath,outputFolder)=>{



// Create the output folder if it doesn't exist
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

const workbook = XLSX.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0]; // Assuming you're working with the first sheet
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet);

data.forEach(row => {
    const userID = row['Transaction ID'];
    const value = row['Value'];

    let jsonContent = JSON.stringify({ value }, null, 2);
    jsonContent=JSON.parse(jsonContent);
    const jsonFilePath = path.join(outputFolder, `${userID}.json`);

    fs.writeFileSync(jsonFilePath, jsonContent.value);

    console.log(`JSON file created: ${jsonFilePath}`);
});
}

module.exports={convertExcelToJson}
