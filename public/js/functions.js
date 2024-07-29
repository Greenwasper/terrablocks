var green = '#1fd655';
var red = '#e51c23';
var yellow = '#ca8a04';
var blue = 'blue';

function ucwords2 (string){

    string = string.toString();

    // try{
        let delimiters = [' ', '-', '(', '*', '|'];

        delimiters.forEach(delimiter => {
            string = string.split(delimiter).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(delimiter);
        });
    // }

    // catch(e){console.log(e);return string;}

    return string;
}

function featureToObject(feature) {
    let obj = {};

    obj['type'] = 'Feature';

    let geometry = {};
    let coordinates = [];

    geometry['type'] = 'Polygon';

    feature.getGeometry().getArray().forEach(function(linearRing) {
        var polygonCoords = [];
        linearRing.getArray().forEach(function(latlng) {
            let latLngJSON = latlng.toJSON();
            polygonCoords.push([latLngJSON.lng, latLngJSON.lat]);
        });
        coordinates.push(polygonCoords);
    });

    geometry['coordinates'] = coordinates;

    obj['geometry'] = geometry;

    return obj;
}

function formatNumber(number) {

    let formattedNumber = parseFloat(number).toFixed(0);

    formattedNumber = parseFloat(formattedNumber).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});


    return formattedNumber;
}

function toastGreen (text) {
    Toastify({
        text: text,
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "rgb(22 163 74)",
            color: "white"
        },
    }).showToast();   
}

function toastRed (text) {
    Toastify({
        text: text,
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "rgb(239 68 68)",
            color: "white"
        },
    }).showToast();   
}

function insertHyphens(input) {
    // Insert hyphens after the first 2 characters and after the next 4 characters
    let formattedString = input.slice(0, 2) + '-' + input.slice(2, 6) + '-' + input.slice(6);
    return formattedString;
}

function formatDate (date){

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const year = date.getFullYear();
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    
    let hours = date.getHours();
    let minutes = date.getMinutes().toString();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    minutes = minutes.length == 1 ? `0${minutes}` : minutes;

    return `${day} ${month}, ${year} - ${hours % 12}:${minutes} ${ampm}`;
}

async function fetchAndPopulateLandDetails (card) {

    let coords = card.querySelector('.coordinates').textContent.split(',');

    let res = await new Promise((resolve, reject) => {
        $.ajax({
            type: 'post',
            url: '/apis/get-land-details',
            data: {lat: parseFloat(coords[0]), lng: parseFloat(coords[1])},
            error: (xhr, status, error) => {
                resolve('error');
            },
            success: function(res){
                try{
                    // res = JSON.parse(res);
                    resolve(res['data']['Table'][0]);
                } catch (e) {
                    resolve('error');
                }
            }
        });
    });

    try{
        card.querySelector('.digital-address').textContent = insertHyphens(res['GPSName']);
    } catch(e){}

    try{
        card.querySelector('.region').textContent = res['Region'];
    }catch(e){}

    try{
        card.querySelector('.suburb').textContent = res['Area'];
    }catch(e){}

    try{
        card.querySelector('.district').textContent = res['District'];
    }catch(e){}

}

async function fetchAndPopulateUserDetails (card, isSecondAddress = true) {
    let firstAddressDetails = await new Promise((resolve, reject) => {
        $.ajax({
            type: 'post',
            url: '/apis/get-owner-details',
            data: {eth_address: card.querySelector('.first-address').textContent},
            error: (xhr, status, error) => {
                console.log(xhr.statusText);
            },
            success: function(res){
                try{
                    resolve(res);
                } catch (e) {
                    console.log(e);
                    resolve('error');
                }
            }
        });
    });

    let secondAddressDetails = {};

    if(isSecondAddress){
        secondAddressDetails = await new Promise((resolve, reject) => {
            $.ajax({
                type: 'post',
                url: '/apis/get-owner-details',
                data: {eth_address: card.querySelector('.second-address').textContent},
                error: (xhr, status, error) => {
                    console.log(xhr.statusText);
                },
                success: function(res){
                    try{
                        resolve(res);
                    } catch (e) {
                        console.log(e);
                        resolve('error');
                    }
                }
            });
        });
    }


    if(firstAddressDetails.name == 'User not found'){
        card.querySelector('.first-address-resolved').textContent = 'Unclaimed';
    } else {
        card.querySelector('.first-address-resolved').textContent = firstAddressDetails.name;
    }

    if(isSecondAddress){
        try{
            if(secondAddressDetails.name == "User not found"){
                card.querySelector('.second-address-resolved').textContent = "No Buyer Acknowledgement";
                card.querySelector('.second-address-resolved').style.color = "#dc2626";
            } else {
                card.querySelector('.second-address-resolved').textContent = secondAddressDetails.name;
            }
        } catch(e){}   
    }
}

function search (data) {
    let searchInput = document.querySelector('#search');
    let searchResultContainer = document.querySelector('#search-results');

    const fuse = new Fuse(data, {
        keys: ['name', 'coordinates'],
        threshold: 0.2
    });

    searchInput.addEventListener('input', e => {
        const result = fuse.search(e.target.value, {limit: 5});
        // console.log(result);

        searchResultContainer.innerHTML = '';

        result.forEach(element => {

            let row = element['item'];

            searchResultContainer.innerHTML += `<a class='search-link' href='plot.php?id=${row.id}'><span style="background: ${row.statusColor};"></span>${row.name} @ ${row.coordinates}</a>`;
        });
    });
}

function dmsToDecimalDegrees(degrees, minutes, seconds) {

    minutes = minutes == '' ? '0' : minutes;
    seconds = seconds == '' ? '0' : seconds;

    let decimalDegrees = parseFloat(degrees) + parseFloat(minutes) / 60 + parseFloat(seconds) / 3600;

    return decimalDegrees;
}

function convertBearing(bearing) {
    bearing = parseFloat(bearing);

    if(bearing > 180){
        bearing = -1 * (360 - bearing);
    }

    return bearing;
}

function metersToKilometers(meters) {
    const metersInKilometer = 1000; // There are 1000 meters in a kilometer
    return meters / metersInKilometer;
}

function yardsToKilometers(yards) {
    const yardsInKilometer = 1093.61; // There are approximately 1093.61 yards in a kilometer
    return yards / yardsInKilometer;
}

function feetToKilometers(feet) {
    const feetInKilometer = 3280.84; // There are approximately 3280.84 feet in a kilometer
    return feet / feetInKilometer;
}

const tooltipOptions = {
    backgroundColor: 'white',
    titleColor: 'black',
    bodyColor: 'black',
    padding: 8
};

document.onreadystatechange = function () {
    var state = document.readyState;
    if (state == 'complete') {
        setTimeout(function(){
            document.getElementsByTagName('body')[0].style.visibility="visible";
        },10);
    }
}

