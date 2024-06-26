async function fetchData(url, cacheKey, cacheDuration, queryParams = {}) {
    const urlWithParams = `${url}?${new URLSearchParams(queryParams).toString()}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}_time`);

    if (cachedData && cachedTime && (new Date().getTime() - parseInt(cachedTime, 10)) < cacheDuration) {
        return JSON.parse(cachedData);
    }

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const base64CompressedData = await response.text();
        const compressedData = Uint8Array.from(atob(base64CompressedData), c => c.charCodeAt(0));
        const decompressedData = await decompressData(compressedData);

        localStorage.setItem(cacheKey, JSON.stringify(decompressedData));
        localStorage.setItem(`${cacheKey}_time`, new Date().getTime().toString());

        return decompressedData;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

async function decompressData(compressedData) {
    const decompressorStream = new DecompressionStream('gzip');
    const writer = decompressorStream.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const reader = decompressorStream.readable.getReader();
    const decompressedChunks = [];
    let totalSize = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        decompressedChunks.push(value);
        totalSize += value.byteLength;
    }

    const concatenated = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of decompressedChunks) {
        concatenated.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return new TextDecoder().decode(concatenated);
}

async function fetchPlayerScoresHtml() {
    const apiPath = '/api/PlayerScores';
    const hostUrlMap = {
        'footy.dosmac.win': 'https://footyscores.azurewebsites.net',
        'azurestaticapps.net': 'https://footyscores-test.azurewebsites.net',
    };
    const functionEndpoint = `${hostUrlMap[Object.keys(hostUrlMap).find(key => window.location.hostname.includes(key))] || 'http://localhost:7188'}${apiPath}`;
    const queryParams = Object.fromEntries(new URLSearchParams(window.location.search));
    const cacheKey = 'playerScoresHtml';
    const cacheDuration = 10000; // 10 seconds

    const loadingElement = document.querySelector('#playerScores .loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    try {
        let playerScoresHtml;
        if ('round' in queryParams || queryParams.fresh === '1') {
            playerScoresHtml = await fetchData(functionEndpoint, cacheKey, 0, queryParams);
        } else {
            playerScoresHtml = await fetchData(functionEndpoint, cacheKey, cacheDuration, queryParams);
        }
        document.getElementById('playerScores').innerHTML = playerScoresHtml;
    } catch (error) {
        console.error('Error fetching player scores:', error);
        document.getElementById('playerScores').innerHTML = '<p class="loading">Oh no. Better luck next time.</p>';
    }

    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    applyCoachClasses();
    addClickListeners();
    checkTableClipping();
}

function applyCoachClasses() {
    const urlParams = new URLSearchParams(window.location.search);
    const coachParam = urlParams.get('coach');
    const tableElement = document.querySelector('table');
    if (coachParam) {
        tableElement.classList.add('filtered');
        const coachValues = coachParam.split(',');

        // if any value of coach is 1, ignore the rest and show all coached players
        if (coachValues.includes('1')) {
            document.querySelectorAll('tr.stats_row[data-coach]').forEach(row => {
                row.classList.add('coach');
            });
            document.querySelectorAll('tr.stats_row:not([data-coach])').forEach(row => {
                row.style.display = 'none';
            });
        } else {
            coachValues.forEach((coachValue, index) => {
                const coachClass = `coach${index + 1}`;
                if (coachValue === '0') {
                    document.querySelectorAll('tr.stats_row:not([data-coach])').forEach(row => {
                        row.classList.add('coach', coachClass);
                    });
                } else {
                    document.querySelectorAll(`tr.stats_row[data-coach="${coachValue}"]`).forEach(row => {
                        row.classList.add('coach', coachClass);
                    });
                }
            });
            document.querySelectorAll('tr.stats_row:not(.coach)').forEach(row => {
                row.style.display = 'none';
            });
        }
    }
}

function checkTableClipping() {
    const mainElement = document.querySelector('main');
    const tableElement = mainElement.querySelector('table');

    if (tableElement) {
        if (tableElement.offsetWidth > mainElement.offsetWidth) {
            mainElement.classList.add('clipped');
        } else {
            mainElement.classList.remove('clipped');
        }
    }
}

function addClickListeners() {
    const reloadElements = document.querySelectorAll('tr.match_header, th.minion, td.playerteam, td.playername');
    reloadElements.forEach(function (element) {
        element.addEventListener('click', fetchPlayerScoresHtml);
    });
}

window.addEventListener('load', fetchPlayerScoresHtml);
window.addEventListener('resize', checkTableClipping);
