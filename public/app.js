async function fetchData(url, cacheKey, cacheDuration) {
	try {
		const cachedData = localStorage.getItem(cacheKey);
		const cachedTime = localStorage.getItem(`${cacheKey}_time`);

		if (cachedData && cachedTime && (new Date().getTime() - parseInt(cachedTime, 10)) < cacheDuration) {
			return JSON.parse(cachedData);
		}

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const base64CompressedData = await response.text();
		const compressedData = Uint8Array.from(atob(base64CompressedData), c => c.charCodeAt(0));
		const decompressedData = await decompressData(compressedData);

		try {
			localStorage.setItem(cacheKey, JSON.stringify(decompressedData));
			localStorage.setItem(`${cacheKey}_time`, new Date().getTime().toString());
		} catch (error) {
			console.error('Error storing data in localStorage:', error);
		}

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

	const decompressedChunks = [];
	const reader = decompressorStream.readable.getReader();
	let totalSize = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
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
	const functionEndpoint = window.location.hostname === 'footy-test.dosmac.win'
		? 'https://footyscores-test.azurewebsites.net/api/PlayerScores'
		: 'https://footyscores.azurewebsites.net/api/PlayerScores';

	const cacheKey = 'playerScoresHtml';
	const cacheDuration = 0; // Set an appropriate cache duration if needed

	const loadingElement = document.querySelector('#playerScores .loading');
	if (loadingElement) {
		loadingElement.style.display = 'block';
	}

	try {
		const playerScoresHtml = await fetchData(functionEndpoint, cacheKey, cacheDuration);
		document.getElementById('playerScores').innerHTML = playerScoresHtml;
	} catch (error) {
		console.error('Error fetching player scores:', error);
		document.getElementById('playerScores').innerHTML = '<p class="loading">Oh no. Better luck next time.</p>';
	}

	if (loadingElement) {
		loadingElement.style.display = 'none';
	}
}

function handleRefreshClick(event) {
	if (event.target.tagName === 'H1') {
		try {
			localStorage.removeItem('playerScoresHtml');
			localStorage.removeItem('playerScoresHtml_time');
		} catch (error) {
			console.error('Error removing data from localStorage:', error);
		}
		fetchPlayerScoresHtml();
	}
}

window.addEventListener('load', fetchPlayerScoresHtml);
document.getElementById('playerScores').addEventListener('click', handleRefreshClick);