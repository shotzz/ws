var webSocket   = null,
    PRICE_RISE = 2,
    PRICE_SAME = 1,
    PRICE_FALL = 0,
    stockObj = {};


function openWSConnection() {
    var webSocketURL = "ws://stocks.mnet.website";
    console.log("openWSConnection::Connecting to: " + webSocketURL);
    try {
        webSocket = new WebSocket(webSocketURL);
        webSocket.onopen = function(openEvent) {
            document.getElementById("wrapper").classList.add("spinner");
            console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
        };
        webSocket.onclose = function (closeEvent) {
            console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
            document.getElementById("wrapper").classList.add("closed");
        };
        webSocket.onerror = function (errorEvent) {
            console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
            document.getElementById("wrapper").classList.add("error");
        };
        webSocket.onmessage = function (messageEvent) {
            var wsMsg = messageEvent.data;
            console.log("WebSocket MESSAGE: " + wsMsg);
            renderStocks(wsMsg);
        };
    } catch (exception) {
        console.error(exception);
        document.getElementById("wrapper").classList.add("failed");
    }
}

openWSConnection();

function renderStocks(wsMsg) {
    document.getElementById("wrapper").classList.remove("spinner");
    var newArray = JSON.parse(wsMsg),
        table = document.getElementById("results");

    newArray.forEach(function (stockData) {
        var name = stockData[0];

        if(!stockObj[name]) {
            var hasInserted = false;
            Object.values(table.children).forEach(function(ele){
                if(ele.dataset.sortVal){
                    if(ele.dataset.sortVal > name && !hasInserted){
                        table.insertBefore(getNewRow(name, name), ele);
                        hasInserted = true;
                    }
                }
            });
            if(!hasInserted){
                table.appendChild(getNewRow(name, name));
            }
        }

        var stockElement = document.getElementById(name);
        updateStockObj(stockData, stockObj[name] || {});
        updateRow(stockElement, stockObj[name]);
    });

    function getNewRow(id, sortVal) {
        var div = document.createElement("div");

        div.setAttribute("id", id);
        div.setAttribute("class", "row");
        div.setAttribute("data-sort-val", sortVal);
        div.onclick = function () {
            populateGraphData(id);
        };
        return div;
    }
}

function updateStockObj(stockData, stock) {
    var name = stockData[0],
        price = stockData[1],
        max = stock.max || price,
        min = stock.min || price,
        prevPrice = stock.price,
        presentTime = Date.now(),
        time = stock.time || presentTime,
        displayTime = 0,
        priceChange = PRICE_SAME,
        priceArray = stock.priceArray || [];

    if(stock.name) {
        if(max<price) {
            max = price;
        } else if(min>price) {
            min = price;
        }

        if(prevPrice > price){
            priceChange = PRICE_FALL;
        }
        else if(prevPrice < price){
            priceChange = PRICE_RISE;
        }

        if(time <= presentTime) {
            displayTime = Math.abs(presentTime - time)/1000;
        }

        priceArray.push(price);
    }

    stockObj[name] = {
        name: name,
        price: price,
        max: max,
        min: min,
        priceChange: priceChange,
        time: presentTime,
        displayTime: displayTime,
        priceArray: priceArray
    };
}

function updateRow(element, data) {
    var name = document.createElement("div"),
        price = document.createElement("div"),
        time = document.createElement("div"),
        max = document.createElement("div"),
        min = document.createElement("div");

    time.setAttribute("id", data.name + "-time");
    price.setAttribute("class", "price");

    name.innerText = data.name;
    price.innerText = data.price.toFixed(4);
    time.innerText = Math.round(data.displayTime)==0? "Jus Now" : Math.round(data.displayTime) + " secs ago";
    max.innerText = data.max.toFixed(4);
    min.innerText = data.min.toFixed(4);

    element.innerHTML = "";

    element.appendChild(name);
    element.appendChild(price);
    element.appendChild(time);
    element.appendChild(max);
    element.appendChild(min);

    if(data.priceChange === PRICE_RISE) {
        element.classList.add("priceRise");
        element.classList.remove("priceFall");
    } else if(data.priceChange === PRICE_FALL) {
        element.classList.remove("priceRise");
        element.classList.add("priceFall");
    } else {
        element.classList.remove("priceRise");
        element.classList.remove("priceFall");
    }
}

setInterval(function () {
    var presentTime = Date.now();
    var names = Object.keys(stockObj);

    names.forEach(function(stock) {
        if(presentTime - stockObj[stock].time > 60000) {
            stockObj[stock].displayTime = stockObj[stock].displayTime + 60;

            document.getElementById(stock+"-time").innerText = Math.round(stockObj[stock].displayTime) || "Jus Now";
        }
    });
}, 60000);

/* Render Charts */

function populateGraphData(stock) {
    resetCanvas();
    var colorArray = ["rgb(54, 162, 235)", "rgb(255, 159, 64)", "rgb(255, 99, 132)", "rgb(255, 205, 86)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"];
    var config = {
        type: 'line',
        data: {
            labels: stockObj[stock].priceArray,
            datasets: [{
                label: stockObj[stock].name,
                backgroundColor: Math.random(colorArray.length-1)*10,
                borderColor: "#0abe51",
                data: stockObj[stock].priceArray
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Live Stock update'
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
                    display: false,
                    scaleLabel: {
                        display: true,
                        labelString: 'Stock'
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Price'
                    }
                }]
            }
        }
    };

    renderLines(config);
}

function renderLines(config) {
    var ctx = document.getElementById('canvas').getContext('2d');
    window.myLine = new Chart(ctx, config);
};

function resetCanvas() {
    var wrapper = document.getElementById("wrapper");
    var canvas = document.createElement("canvas");
    canvas.setAttribute("id", "canvas");
    canvas.setAttribute("class", "chartjs-render-monitor");
    canvas.setAttribute("height", "350");
    canvas.setAttribute("width", "700");

    document.getElementById("canvas").remove();
    wrapper.appendChild(canvas);
    canvas.scrollIntoView();
}

function gotoResults() {
    var results = document.getElementById("wrapper");
    results.scrollIntoView();

}