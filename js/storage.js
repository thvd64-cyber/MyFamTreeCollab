// storage.js
// Centrale opslagmodule voor Stamboom applicatie
// Production-proof, geoptimaliseerd

(function () {
    'use strict';

    const STORAGE_KEY = 'stamboomData';
    const VERSION_KEY = 'stamboomDataVersion';
    const STORAGE_VERSION = '2.0.0';

    /**
     * Veilig JSON parsen
     */
    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('JSON parse fout in localStorage:', error);
            return null;
        }
    }

    /**
     * Controleert of object geldige persoon structuur heeft
     */
    function isValidPersoon(p) {
        return (
            p &&
            typeof p === 'object' &&
            typeof p.ID === 'string' &&
            typeof p.Doopnaam === 'string' &&
            typeof p.Achternaam === 'string'
        );
    }

    /**
     * Valideert volledige dataset
     */
    function validateDataset(data) {
        if (!Array.isArray(data)) return false;

        for (let i = 0; i < data.length; i++) {
            if (!isValidPersoon(data[i])) {
                console.warn('Ongeldige persoon gevonden op index:', i);
                return false;
            }
        }

        return true;
    }

    /**
     * Reset storage veilig
     * Alleen gebruikt bij handmatige reset of import
     */
    function clearStamboomStorage() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
        console.warn('Stamboom localStorage is gereset.');
        return true;
    }

    /**
     * Haalt dataset veilig op
     * Valideert, maar clear niet automatisch
     */
    function getStamboomData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = safeParse(raw);
        if (!parsed || !validateDataset(parsed)) {
            console.warn('Dataset is corrupt of ongeldig. Lege array wordt teruggegeven.');
            return [];
        }

        return parsed;
    }

    /**
     * Slaat dataset veilig op
     */
    function setStamboomData(data) {
        if (!validateDataset(data)) {
            console.error('Opslaan geweigerd: dataset ongeldig.');
            return false;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
            return true;
        } catch (error) {
            console.error('Fout bij opslaan in localStorage:', error);
            return false;
        }
    }

    /**
     * Voegt persoon toe met duplicate ID check
     */
    function addPersoon(persoon) {
        const data = getStamboomData();

        const exists = data.some(p => p.ID === persoon.ID);
        if (exists) {
            console.error('Duplicate ID gedetecteerd:', persoon.ID);
            return false;
        }

        data.push(persoon);
        return setStamboomData(data);
    }

    /**
     * Vervangt volledige dataset (bij import)
     */
    function replaceDataset(newData) {
        if (!validateDataset(newData)) {
            console.error('Import geweigerd: dataset ongeldig.');
            return false;
        }

        clearStamboomStorage();
        return setStamboomData(newData);
    }

    /**
     * Expose publieke API
     */
    window.StamboomStorage = {
        get: getStamboomData,
        set: setStamboomData,
        add: addPersoon,
        replace: replaceDataset,
        clear: clearStamboomStorage,
        version: STORAGE_VERSION
    };

})();
