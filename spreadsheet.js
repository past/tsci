const fs = require('fs');
const readline = require('readline');

async function createSpreadsheet(sheets, title, maxDate) {
    const resource = {
        properties: {
            title,
        }
    }
    const { data } = await sheets.spreadsheets.create({ resource });
    const spreadsheetId = data.spreadsheetId;
    const sheetId = data.sheets[0].properties.sheetId;
    // Construct the sheet title.
    const sheetTitle = getSheetTitle(maxDate);
    // Fix sheet name.
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                "updateSheetProperties": {
                    "properties": {
                        sheetId,
                        title: sheetTitle,
                    },
                    "fields": "title"
                },
            }]
        },
    });

    console.log(`Created new spreadsheet with ID: ${spreadsheetId}`);
    return spreadsheetId;
}

async function addBugData(sheets, spreadsheetId, bugTable, title) {
    let result = await sheets.spreadsheets.get({
        spreadsheetId,
    });
    const valueInputOption = 'USER_ENTERED';

    const bugzilla = bugTable.get("bugzilla");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!C3:C${bugzilla.length + 2}`,
        resource: {
            values: [bugzilla],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated bugzilla cells: ' + result.data.updatedCells);

    const bugzillaMobile = bugTable.get("bugzillaMobile");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!D3:D${bugzillaMobile.length + 2}`,
        resource: {
            values: [bugzillaMobile],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated bugzilla (mobile) cells: ' + result.data.updatedCells);

    const webcompat = bugTable.get("webcompat");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!E3:E${webcompat.length + 2}`,
        resource: {
            values: [webcompat],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated webcompat cells: ' + result.data.updatedCells);

    const webcompatMobile = bugTable.get("webcompatMobile");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!F3:F${webcompatMobile.length + 2}`,
        resource: {
            values: [webcompatMobile],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated webcompat (mobile) cells: ' + result.data.updatedCells);

    const criticals = bugTable.get("criticals");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!G3:G${criticals.length + 2}`,
        resource: {
            values: [criticals],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated criticals cells: ' + result.data.updatedCells);

    const criticalsMobile = bugTable.get("criticalsMobile");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!H3:H${criticalsMobile.length + 2}`,
        resource: {
            values: [criticalsMobile],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated criticals (mobile) cells: ' + result.data.updatedCells);

    const duplicates = bugTable.get("duplicates");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!I3:I${duplicates.length + 2}`,
        resource: {
            values: [duplicates],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated duplicates cells: ' + result.data.updatedCells);

    const duplicatesMobile = bugTable.get("duplicatesMobile");
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!J3:J${duplicatesMobile.length + 2}`,
        resource: {
            values: [duplicatesMobile],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated duplicates (mobile) cells: ' + result.data.updatedCells);
}

async function findOrCreateSheet(sheets, spreadsheetId, maxDate) {
    let result = await sheets.spreadsheets.get({
        spreadsheetId,
    });
    // Construct the sheet title.
    const title = getSheetTitle(maxDate);

    // Find the sheet to update...
    let sheetId;
    for (const sheet of result.data.sheets) {
        const { properties } = sheet;
        if (properties.title !== title) {
            continue;
        }
        sheetId = properties.sheetId;
        result = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    "updateCells": {
                        "range": {
                            sheetId
                        },
                        "fields": "userEnteredValue"
                    }
                }]
            }
        });
        console.log(`Found and cleared sheet with ID ${sheetId}`);
    }
    // ... or create a new sheet.
    if (sheetId === undefined) {
        result = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    "addSheet": {
                        "properties": {
                            title
                        }
                    }
                }]
            }
        });
        sheetId = result.data.replies[0].addSheet.properties.sheetId;
        console.log(`Added sheet with ID ${sheetId}`);
    }
    return {
        sheetId,
        title
    }
}

async function addStaticData(sheets, spreadsheetId, listSize, listFile = 'data/list.csv', sheetId, title) {
    let result = await sheets.spreadsheets.get({
        spreadsheetId,
    });

    const valueInputOption = 'USER_ENTERED';
    const requests = [];
    const range = {
        "sheetId": sheetId,
        "startRowIndex": 0,
        "endRowIndex": 1,
        "startColumnIndex": 0,
        "endColumnIndex": 2
    };
    const headers = ['Rank', 'Website', 'bugzilla', 'bugzilla (mobile)', 'webcompat.com',
        'webcompat.com (mobile)', 'criticals', 'criticals (mobile)', 'duplicates',
        'duplicates (mobile)', 'critical weight', 'SCI', 'SCI (mobile)', 'Site weight',
        'Weighted SCI', 'Weighted SCI (mobile)'];

    // Insert totals row.
    requests.push({
        "insertRange": {
            range,
            "shiftDimension": 'ROWS'
        },
    });
    // Insert header row.
    requests.push({
        "insertRange": {
            range,
            "shiftDimension": 'ROWS'
        },
    });

    const batchUpdateRequest = { requests };

    result = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: batchUpdateRequest,
    });
    console.log('Inserted header row');


    const totals = [
        "Total",
        "",
        `=SUM(C3:C${listSize + 2})`,
        `=SUM(D3:D${listSize + 2})`,
        `=SUM(E3:E${listSize + 2})`,
        `=SUM(F3:F${listSize + 2})`,
        `=SUM(G3:G${listSize + 2})`,
        `=SUM(H3:H${listSize + 2})`,
        `=SUM(I3:I${listSize + 2})`,
        `=SUM(J3:J${listSize + 2})`,
        "",
        `=SUM(L3:L${listSize + 2})`,
        `=SUM(M3:M${listSize + 2})`,
        "",
        `=SUM(O3:O${listSize + 2})`,
        `=SUM(P3:P${listSize + 2})`
    ];
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1:P1`,
        resource: {
            values: [totals],
        },
        valueInputOption,
    })
    console.log('Updated totals cell: ' + result.data.updatedCells);

    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A2:P2`,
        resource: {
            values: [headers],
        },
        valueInputOption,
    })
    console.log('Updated header cells: ' + result.data.updatedCells);

    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!K3`,
        resource: {
            values: [['25%']],
        },
        valueInputOption,
    })
    console.log('Updated critical weight cell: ' + result.data.updatedCells);

    const weights = [];
    for (let i = 2; i < listSize + 2; i++) {
        weights.push(`=1/A${i+1}`)
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!N3:N${listSize+2}`,
        resource: {
            values: [weights],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated site weight cells: ' + result.data.updatedCells);

    const sci = [];
    for (let i = 2; i < listSize + 2; i++) {
        sci.push(`=(C${i + 1} + E${i + 1} + I${i + 1}) + (G${i + 1} * $K$3)`)
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!L3:L${listSize + 2}`,
        resource: {
            values: [sci],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated SCI cells: ' + result.data.updatedCells);

    const mobileSci = [];
    for (let i = 2; i < listSize + 2; i++) {
        mobileSci.push(`=(D${i + 1} + F${i + 1} + J${i + 1}) + (H${i + 1} * $K$3)`)
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!M3:M${listSize + 2}`,
        resource: {
            values: [mobileSci],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    })
    console.log('Updated SCI (mobile) cells: ' + result.data.updatedCells);

    const wsci = [];
    for (let i = 2; i < listSize + 2; i++) {
        wsci.push(`=L${i + 1}*N${i + 1}`)
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!O3:O${listSize + 2}`,
        resource: {
            values: [wsci],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    });
    console.log('Updated weighted SCI cells: ' + result.data.updatedCells);

    const mobileWsci = [];
    for (let i = 2; i < listSize + 2; i++) {
        mobileWsci.push(`=M${i + 1}*N${i + 1}`)
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!P3:P${listSize + 2}`,
        resource: {
            values: [mobileWsci],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    });
    console.log('Updated weighted SCI (mobile) cells: ' + result.data.updatedCells);

    // Load the website list.
    const fileStream = fs.createReadStream(listFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const ranks = [];
    const websites = [];
    let i = 0;
    for await (const line of rl) {
        const [ rank, website ] = line.split(',');
        ranks.push(rank);
        websites.push(website);
        if (++i >= listSize) {
            break;
        }
    }
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A3:A${listSize + 2}`,
        resource: {
            values: [ranks],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    });
    console.log('Updated rank cells: ' + result.data.updatedCells);
    result = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!B3:B${listSize + 2}`,
        resource: {
            values: [websites],
            majorDimension: "COLUMNS",
        },
        valueInputOption,
    });
    console.log('Updated website cells: ' + result.data.updatedCells);
}

const shareSheet = async (drive, id, emailAddress) => {
    try {
        const { data } = await drive.permissions.create({
            fileId: id,
            type: 'user',
            resource: {
                type: 'user',
                role: 'writer',
                emailAddress,
                transferOwnership: false,
            },
        });
        console.log(`Permission Id: ${data.id}`);
    } catch (err) {
        console.log(`Failed sharing with ${emailAddress}`);
        console.log(err);
    }
}

/**
 * Return the title of the sheet for the specified date.
 * @param {Date} date the date of the sheet
 * @returns a String with the sheet title
 */
function getSheetTitle(date) {
    if (!date) {
        date = new Date();
    }
    return `${date.getFullYear()}/${(date.getMonth() + 1)}/${date.getDate()}`;
}

module.exports = {
    addBugData,
    addStaticData,
    createSpreadsheet,
    findOrCreateSheet,
    shareSheet,
}
