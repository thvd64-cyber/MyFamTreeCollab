// schema.js
(function () {
    'use strict';

    const FIELDS = [
        "ID",
        "Doopnaam",
        "Roepnaam",
        "Prefix",
        "Achternaam",
        "Geslacht",
        "Geboortedatum",
        "Geboorteplaats",
        "Overlijdensdatum",
        "Overlijdensplaats",
        "VaderID",
        "MoederID",
        "PartnerID",
        "Huwelijksdatum",
        "Huwelijksplaats",
        "Opmerkingen",
        "Adres",
        "ContactInfo",
        "URL"
    ];

    function getHeader() {
        return FIELDS.join(",");
    }

    function validateHeader(headerLine) {
        return headerLine.trim() === getHeader();
    }

    function createEmptyPersoon() {
        const obj = {};
        FIELDS.forEach(field => obj[field] = "");
        return obj;
    }

    function objectToCSVRow(obj) {
        return FIELDS.map(field => {
            const value = obj[field] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",");
    }

    function csvRowToObject(row) {
        const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (values.length !== FIELDS.length) {
            console.error(
                `CSV kolom mismatch: verwacht ${FIELDS.length}, kreeg ${values.length}`
            );
            return null;
        }

        const obj = {};

        FIELDS.forEach((field, index) => {
            let value = values[index] || "";
            value = value.replace(/^"|"$/g, "").replace(/""/g, '"');
            obj[field] = value;
        });

        return obj;
    }

    function getFieldCount() {
        return FIELDS.length;
    }

    window.StamboomSchema = {
        fields: FIELDS,
        header: getHeader,
        validateHeader: validateHeader,
        empty: createEmptyPersoon,
        toCSV: objectToCSVRow,
        fromCSV: csvRowToObject,
        count: getFieldCount
    };

})();
