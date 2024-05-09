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
    const cacheDuration = 0; // undo for testing

    const loadingElement = document.querySelector('#playerScores .loading');

    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    try {
        const playerScoresHtml = await fetchData(functionEndpoint, cacheKey, cacheDuration, queryParams);
        document.getElementById('playerScores').innerHTML = playerScoresHtml;
    } catch (error) {
        console.error('Error fetching player scores:', error);
        document.getElementById('playerScores').innerHTML = '<p class="loading">Oh no. Better luck next time.</p>';
    }

    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    checkTableClipping();
}

function handleRefreshClick(event) {
    if (event.target.tagName === 'H1') {
        localStorage.removeItem('playerScoresHtml');
        localStorage.removeItem('playerScoresHtml_time');
        fetchPlayerScoresHtml();
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

window.addEventListener('load', fetchPlayerScoresHtml);
window.addEventListener('resize', checkTableClipping);
document.getElementById('playerScores').addEventListener('click', handleRefreshClick);