const CONFIG = {
  SHEET_NAME: "Form Responses 1",

  ORDER_NUMBER_PREFIX: "DM-",

  TRACKING_CODE_LENGTH: 10,

  HEADERS: [
    "Timestamp",
    "Customer name",
    "Payment method",
    "Extra",
    "Contact Information",
    "Type Order",
    "Type:Notes",
    "Order Number",
    "Tracking Code",
    "Status",
    "Last Updated",
    "Delivery Latitude",
    "Delivery Longitude"
  ],

  STATUSES: [
    "Order Received",
    "Preparing",
    "Ready",
    "Out for Delivery",
    "Delivered"
  ]
};


/* =========================================================
   SETUP
   ========================================================= */

function setupDardomaTracking() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SHEET_NAME
    );

  if (!sheet) {
    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found.'
    );
  }


  /*
   * Make sure headers are correct.
   */

  sheet
    .getRange(
      1,
      1,
      1,
      CONFIG.HEADERS.length
    )
    .setValues([
      CONFIG.HEADERS
    ]);


  /*
   * Status dropdown.
   */

  const statusRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        CONFIG.STATUSES,
        true
      )
      .setAllowInvalid(false)
      .build();

  sheet
    .getRange(
      2,
      10,
      Math.max(
        sheet.getMaxRows() - 1,
        1
      ),
      1
    )
    .setDataValidation(
      statusRule
    );


  /*
   * Install the Form Submit trigger.
   */

  const triggers =
    ScriptApp.getProjectTriggers();

  const triggerExists =
    triggers.some(function(trigger) {

      return (
        trigger.getHandlerFunction() ===
          "onFormSubmit" &&

        trigger.getEventType() ===
          ScriptApp.EventType.ON_FORM_SUBMIT
      );

    });


  if (!triggerExists) {

    ScriptApp
      .newTrigger(
        "onFormSubmit"
      )
      .forSpreadsheet(
        spreadsheet
      )
      .onFormSubmit()
      .create();

  }


  SpreadsheetApp.flush();

  Logger.log(
    "DardomaMOGS tracking setup complete."
  );

  Logger.log(
    "Form-submit trigger ready."
  );
}


/* =========================================================
   FORM SUBMISSION
   ========================================================= */

function onFormSubmit(e) {

  if (!e || !e.range) {

    throw new Error(
      "This function must be triggered by a spreadsheet form submission."
    );

  }


  const sheet =
    e.range.getSheet();

  const row =
    e.range.getRow();


  /*
   * Ignore other sheets.
   */

  if (
    sheet.getName() !==
    CONFIG.SHEET_NAME
  ) {

    return;

  }


  createTrackingData(
    sheet,
    row
  );
}


/* =========================================================
   CREATE / SYNCHRONIZE TRACKING DATA
   ========================================================= */

function createTrackingData(
  sheet,
  row
) {

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      13
    );


  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];


  /*
   * F = Type Order
   * G = Type:Notes
   * H = Order Number
   * I = Tracking Code
   * J = Status
   * K = Last Updated
   */

  const orderField =
    String(values[5] || "");


  const notesField =
    String(values[6] || "");


  let orderNumber =
    normalizeOrderNumber(
      values[7]
    );


  let trackingCode =
    normalizeTrackingCode(
      values[8]
    );


  const existingStatus =
    String(
      values[9] || ""
    ).trim();


  const existingUpdated =
    values[10];


  /*
   * Try Order field first.
   */

  if (!orderNumber) {

    orderNumber =
      extractOrderNumber(
        orderField
      );

  }


  if (!trackingCode) {

    trackingCode =
      extractTrackingCode(
        orderField
      );

  }


  /*
   * Try Notes field.
   */

  if (!orderNumber) {

    orderNumber =
      extractOrderNumber(
        notesField
      );

  }


  if (!trackingCode) {

    trackingCode =
      extractTrackingCode(
        notesField
      );

  }


  /*
   * Old/manual submissions:
   * create identifiers if necessary.
   */

  if (!orderNumber) {

    orderNumber =
      generateOrderNumber();

  }


  if (!trackingCode) {

    trackingCode =
      generateTrackingCode();

  }


  const status =
    existingStatus ||
    "Order Received";


  const updatedTime =
    existingUpdated ||
    new Date();


  /*
   * Write H:I:J:K.
   */

  sheet
    .getRange(row, 8)
    .setValue(orderNumber);


  sheet
    .getRange(row, 9)
    .setValue(trackingCode);


  sheet
    .getRange(row, 10)
    .setValue(status);


  sheet
    .getRange(row, 11)
    .setValue(updatedTime);


  SpreadsheetApp.flush();


  return {

    orderNumber:
      orderNumber,

    trackingCode:
      trackingCode,

    status:
      status

  };
}


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeOrderNumber(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase();

}


function normalizeTrackingCode(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase();

}


/* =========================================================
   EXTRACT ORDER NUMBER
   ========================================================= */

function extractOrderNumber(
  text
) {

  if (!text) {

    return "";

  }


  const match =
    String(text).match(
      /Order\s*Number\s*:\s*(DM-[A-Z0-9]+)/i
    );


  return match
    ? normalizeOrderNumber(
        match[1]
      )
    : "";

}


/* =========================================================
   EXTRACT TRACKING CODE
   ========================================================= */

function extractTrackingCode(
  text
) {

  if (!text) {

    return "";

  }


  const match =
    String(text).match(
      /Tracking\s*Code\s*:\s*([A-Z0-9]+)/i
    );


  return match
    ? normalizeTrackingCode(
        match[1]
      )
    : "";

}


/* =========================================================
   GENERATE ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

  const number =
    Math.floor(
      1000 +
      Math.random() * 9000
    );


  return (
    CONFIG.ORDER_NUMBER_PREFIX +
    number
  );

}


/* =========================================================
   GENERATE TRACKING CODE
   ========================================================= */

function generateTrackingCode() {

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  let code = "";


  for (
    let i = 0;
    i <
    CONFIG.TRACKING_CODE_LENGTH;
    i++
  ) {

    code +=
      characters.charAt(
        Math.floor(
          Math.random() *
          characters.length
        )
      );

  }


  return code;

}


/* =========================================================
   UPDATE ORDER STATUS
   ========================================================= */

function updateOrderStatus(
  orderNumber,
  newStatus
) {

  if (
    !CONFIG.STATUSES.includes(
      newStatus
    )
  ) {

    throw new Error(
      "Invalid status: " +
      newStatus
    );

  }


  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        CONFIG.SHEET_NAME
      );


  if (!sheet) {

    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found.'
    );

  }


  const data =
    sheet
      .getDataRange()
      .getDisplayValues();


  const targetOrder =
    normalizeOrderNumber(
      orderNumber
    );


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const currentOrder =
      normalizeOrderNumber(
        data[i][7]
      );


    if (
      currentOrder ===
      targetOrder
    ) {

      const row =
        i + 1;


      sheet
        .getRange(row, 10)
        .setValue(
          newStatus
        );


      sheet
        .getRange(row, 11)
        .setValue(
          new Date()
        );


      SpreadsheetApp.flush();


      return {

        success: true,

        orderNumber:
          targetOrder,

        status:
          newStatus

      };

    }

  }


  return {

    success: false,

    error:
      "Order not found."

  };

}


/* =========================================================
   DELIVERY LOCATION
   ========================================================= */

function setDeliveryLocation(
  orderNumber,
  latitude,
  longitude
) {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        CONFIG.SHEET_NAME
      );


  if (!sheet) {

    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found.'
    );

  }


  const data =
    sheet
      .getDataRange()
      .getDisplayValues();


  const targetOrder =
    normalizeOrderNumber(
      orderNumber
    );


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const currentOrder =
      normalizeOrderNumber(
        data[i][7]
      );


    if (
      currentOrder ===
      targetOrder
    ) {

      const row =
        i + 1;


      sheet
        .getRange(row, 12)
        .setValue(
          latitude
        );


      sheet
        .getRange(row, 13)
        .setValue(
          longitude
        );


      sheet
        .getRange(row, 11)
        .setValue(
          new Date()
        );


      SpreadsheetApp.flush();


      return {

        success: true,

        orderNumber:
          targetOrder,

        latitude:
          latitude,

        longitude:
          longitude

      };

    }

  }


  return {

    success: false,

    error:
      "Order not found."

  };

}


/* =========================================================
   FIND ORDER
   ========================================================= */

function findOrder(
  orderNumber,
  trackingCode
) {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        CONFIG.SHEET_NAME
      );


  if (!sheet) {

    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found.'
    );

  }


  const data =
    sheet
      .getDataRange()
      .getDisplayValues();


  const targetOrder =
    normalizeOrderNumber(
      orderNumber
    );


  const targetTracking =
    normalizeTrackingCode(
      trackingCode
    );


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const currentOrder =
      normalizeOrderNumber(
        data[i][7]
      );


    const currentTracking =
      normalizeTrackingCode(
        data[i][8]
      );


    if (
      currentOrder ===
        targetOrder &&

      currentTracking ===
        targetTracking
    ) {

      return {

        found: true,

        orderNumber:
          currentOrder,

        trackingCode:
          currentTracking,

        status:
          String(
            data[i][9] ||
            "Order Received"
          ).trim(),

        lastUpdated:
          data[i][10]
            ? new Date(
                data[i][10]
              ).toISOString()
            : null,

        latitude:
          data[i][11] !== ""
            ? Number(
                data[i][11]
              )
            : null,

        longitude:
          data[i][12] !== ""
            ? Number(
                data[i][12]
              )
            : null

      };

    }

  }


  return {

    found: false,

    error:
      "Order not found."

  };

}


/* =========================================================
   WEB API
   ========================================================= */

function doGet(e) {

  try {

    const params =
      e &&
      e.parameter
        ? e.parameter
        : {};


    const orderNumber =
      normalizeOrderNumber(
        params.orderNumber ||
        params.order ||
        ""
      );


    const trackingCode =
      normalizeTrackingCode(
        params.trackingCode ||
        params.code ||
        ""
      );


    if (
      !orderNumber ||
      !trackingCode
    ) {

      return jsonResponse({

        success: false,

        found: false,

        error:
          "Missing orderNumber or trackingCode."

      });

    }


    const result =
      findOrder(
        orderNumber,
        trackingCode
      );


    /*
     * IMPORTANT:
     * The website expects:
     *
     * data.success
     * data.order
     */

    if (!result.found) {

      return jsonResponse({

        success: false,

        found: false,

        error:
          "Order not found."

      });

    }


    return jsonResponse({

      success: true,

      found: true,

      order: {

        orderNumber:
          result.orderNumber,

        trackingCode:
          result.trackingCode,

        status:
          result.status,

        lastUpdated:
          result.lastUpdated,

        latitude:
          result.latitude,

        longitude:
          result.longitude

      }

    });

  }


  catch (error) {

    return jsonResponse({

      success: false,

      found: false,

      error:
        error.message

    });

  }

}


/* =========================================================
   JSON RESPONSE
   ========================================================= */

function jsonResponse(
  data
) {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        data
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =========================================================
   TEST EXISTING TRACKING SYSTEM
   ========================================================= */

function testDardomaTracking() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        CONFIG.SHEET_NAME
      );


  if (!sheet) {

    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found.'
    );

  }


  const row =
    sheet.getLastRow() + 1;


  const orderNumber =
    "DM-TEST";


  const trackingCode =
    "TEST123456";


  sheet
    .getRange(row, 1)
    .setValue(
      new Date()
    );


  sheet
    .getRange(row, 2)
    .setValue(
      "Test Customer"
    );


  sheet
    .getRange(row, 3)
    .setValue(
      "Cash on delivery"
    );


  sheet
    .getRange(row, 5)
    .setValue(
      "01000000000"
    );


  sheet
    .getRange(row, 6)
    .setValue(
      "Order Number: " +
      orderNumber +
      "\nTracking Code: " +
      trackingCode +
      "\nMango Dardoma x1"
    );


  sheet
    .getRange(row, 7)
    .setValue(
      "Tracking test order"
    );


  sheet
    .getRange(row, 8)
    .setValue(
      orderNumber
    );


  sheet
    .getRange(row, 9)
    .setValue(
      trackingCode
    );


  sheet
    .getRange(row, 10)
    .setValue(
      "Order Received"
    );


  sheet
    .getRange(row, 11)
    .setValue(
      new Date()
    );


  SpreadsheetApp.flush();


  Logger.log(
    "Test created: " +
    orderNumber +
    " / " +
    trackingCode
  );

}
