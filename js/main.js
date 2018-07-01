/* 
- ALC With Google
- #7DayCodeChallenge
- Project: Currency Converter
- Developer: Zelalem Gebeyehu Tessema 
*/

class CurrencyConverter {
    constructor() {
        this.apiUrl = 'https://free.currencyconverterapi.com';
        this.currenciesEndpoint = '/api/v5/currencies';
        this.convertEndpoint = '/api/v5/convert';
        this.idbPromise = this.initIDB();
        this.fromCurrency = document.getElementById('fromCurrency');
        this.amount = document.getElementById('amount');
        this.toCurrency = document.getElementById('toCurrency');
        this.currencyInfoFrom = document.getElementById('currencyInfoFrom');
        this.currencyInfoTo = document.getElementById('currencyInfoTo');
        this.rateMultiplier = document.getElementById('rateMultiplier');
        this.convertedValue = document.getElementById('convertedValue');
        this.chartCanvas = document.getElementById('currencyChart');
        this.chartObj;
    }

    initApp() {

        this.populateCurrencies();

        this.fromCurrency.addEventListener('change', (e) => {
            this.updateCurrencyInfo();
        });

        this.toCurrency.addEventListener('change', () => {
            this.updateCurrencyInfo();
        });

        this.amount.addEventListener('change', () => {
            this.convertCurrency();
        });

        this.amount.addEventListener('keydown', (e) => {
            if (e.keyCode == 13) {
                event.preventDefault();
                this.convertCurrency();
            }
        });
    }

    registerServiceWorker() {
        if (!navigator.serviceWorker) return;

        navigator.serviceWorker.register('sw.js')
            .then(_ => { return; })
            .catch(_ => console.log("Service Worker Failed"));
    }

    /************** Currency Converter Methods *************/
    populateCurrencies() {
        const currenciesList = this.getCurrencies();
        let elements = [this.fromCurrency, this.toCurrency];
        elements.map(selectField => {
            currenciesList.then(currencies => {
                for (const currency of currencies) {
                    let option = document.createElement("option");
                    option.value = currency.id;
                    option.innerHTML = `${currency.currencyName} (${currency.id})`;
                    selectField.appendChild(option);
                }
            });
        });
    }

    convertCurrency() {
        let result = this.amount.value * this.rateMultiplier.value;
        this.convertedValue.value = result;
    }

    updateCurrencyInfo() {
        if (this.fromCurrency.value != 0 && this.toCurrency.value != 0) {
            const ratePromise = this.getRate(this.fromCurrency.value, this.toCurrency.value);
            ratePromise.then(currencyRate => {
                const roundedRate = parseFloat(Object.values(currencyRate)).toPrecision(4);
                this.rateMultiplier.value = roundedRate;
                this.currencyInfoFrom.innerHTML = `1 ${this.fromCurrency.options[this.fromCurrency.selectedIndex].innerHTML} equals`;
                this.currencyInfoTo.innerHTML = `${roundedRate} ${this.toCurrency.options[this.toCurrency.selectedIndex].innerHTML}`;
                this.getHistory(this.fromCurrency.value, this.toCurrency.value);
            }).then(_ => this.convertCurrency());
        } else {
            this.rateMultiplier.value = 0;
            this.convertCurrency();
        }
    }
    /************** END of Currency Converter Methods **********/

    /*************** IDB Calls *****************/

    getCurrencies() {
        return this.idbPromise.then((db) => {
            if (db) {
                var index = db.transaction('currencies')
                    .objectStore('currencies');

                return index.getAll().then((currenciesList) => {
                    if (currenciesList.length != 0)
                        return currenciesList
                    else
                        return this.getCurrenciesFromAPI();
                });
            }
            else
                return this.getCurrenciesFromAPI();
        });
    }

    getRate(from, to) {
        return this.idbPromise.then((db) => {
            if (db) {
                var index = db.transaction('currenciesRate')
                    .objectStore('currenciesRate');
                return index.get(`${from}_${to}`).then((jsonData) => {
                    if (jsonData)
                        return { jsonData }
                    else
                        return this.getRateFromAPI(from, to);
                });
            } else
                return this.getRateFromAPI(from, to);
        });
    }

    getHistory(from, to) {
        //The free version of FreeCurrencyConverter API only allows 8 days of history!!!
        let date = new Date();
        const endDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        //Get the staring date by subtracting 7 Days from now 
        date.setDate(date.getDate() - 7);
        const startDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        return this.idbPromise.then((db) => {
            if (db) {
                var index = db.transaction('currenciesHistory')
                    .objectStore('currenciesHistory');
                return index.get(`${from}_${to}`).then((jsonData) => {
                    if (jsonData) {
                        this.removeChartData();
                        this.redrawChart(jsonData);
                    }
                    else
                        return this.getHistoryFromAPI(from, to);
                });
            } else
                return this.getHistoryFromAPI(from, to);
        });
    }

    /*************** END Of IDB Calls *****************/

    /********* API Promise Calls *************/

    getCurrenciesFromAPI() {
        return fetch(`${this.apiUrl}${this.currenciesEndpoint}`)
            .then(response => {
                return response.json();
            }).then(jsonData => {
                const currenciesList = Object.keys(jsonData.results).map(i => jsonData.results[i]);

                //Store it to IDB Currency-Db Store for offline use
                this.idbPromise.then((db) => {
                    var tx = db.transaction('currencies', 'readwrite');
                    var store = tx.objectStore('currencies');
                    currenciesList.map(currency => {
                        store.put(currency);
                    });
                });
                return currenciesList;
            }).catch(error => console.error(error));
    }

    getRateFromAPI(from, to) {
        return fetch(`${this.apiUrl}${this.convertEndpoint}?q=${from}_${to}&compact=ultra`)
            .then(response => {
                return response.json();
            })
            .then(jsonData => {
                //Store for future reference
                this.idbPromise.then((db) => {
                    var tx = db.transaction('currenciesRate', 'readwrite');
                    var store = tx.objectStore('currenciesRate');
                    store.put(Object.values(jsonData)[0], Object.keys(jsonData)[0]);
                    tx.complete;
                });
                return jsonData;
            })
            .catch(error => console.error(error));
    }

    getHistoryFromAPI(from, to) {
        //The free version of FreeCurrencyConverter API only allows 8 days of history!!!
        let date = new Date();
        const endDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        //Get the staring date by subtracting 7 Days from now 
        date.setDate(date.getDate() - 7);
        const startDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        return fetch(`${this.apiUrl}${this.convertEndpoint}?q=${from}_${to}&compact=ultra&date=${startDate}&endDate=${endDate}`)
            .then(response => {
                return response.json();
            })
            .then(jsonData => {

                //Store Currencies History for future references
                this.idbPromise.then((db) => {
                    var tx = db.transaction('currenciesHistory', 'readwrite');
                    var store = tx.objectStore('currenciesHistory');
                    store.put(jsonData, Object.keys(jsonData)[0]);
                    tx.complete;
                });

                this.removeChartData();
                this.redrawChart(jsonData);
            }).catch(error => console.error(error));
    }

    /******* END of API Calls *********/


    /******* CHART JS for Currency History *********/

    initChart() {
        var XRange = [];
        var config = {
            type: 'line',
            data: {
                labels: XRange,
                datasets: [{
                    label: 'Currency history for the past 8 Days',
                    backgroundColor: 'dodgerblue',
                    borderColor: 'dodgerblue',
                    data: [],
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Currency History'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Days'
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Value'
                        }
                    }]
                }
            }
        };

        const ctx = document.getElementById('currencyChart').getContext('2d');
        this.chartObj = new Chart(ctx, config);
    }

    addChartData(title, label, data) {
        this.chartObj.options.title.text = `${title} Currency Rates Chart`;
        this.chartObj.data.labels.push(label);
        this.chartObj.data.datasets.forEach((dataset) => {
            dataset.data.push(data);
        });
        this.chartObj.update();
    }

    removeChartData() {
        let loopIndex = 0;
        while (loopIndex < 8) {
            this.chartObj.data.labels.pop();
            this.chartObj.data.datasets.map((dataset) => {
                dataset.data.pop();
            });
            this.chartObj.update();
            loopIndex += 1;
        }
    }

    redrawChart(dataset) {
        const objectKey = Object.keys(dataset)[0];
        Object.keys(dataset[objectKey]).map(i => {
            this.addChartData(objectKey, i, dataset[objectKey][i]);
        });
    }

    /******* END of Chart JS Methods ************/

    /** IDB Initialization */
    initIDB() {
        return idb.open('currency-db', 3, function (upgradeDb) {
            switch (upgradeDb.oldVersion) {
                case 0:
                    const currenciesStore = upgradeDb.createObjectStore('currencies', { keyPath: 'id' });
                case 1:
                    const currenciesRateStore = upgradeDb.createObjectStore('currenciesRate');
                case 2:
                    const currenciesHistoryStore = upgradeDb.createObjectStore('currenciesHistory');
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let currencyConverter = new CurrencyConverter();

    currencyConverter.registerServiceWorker();
    currencyConverter.initApp();
    currencyConverter.initChart();

});






