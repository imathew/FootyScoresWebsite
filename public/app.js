// Function to fetch data from the Azure Function API
async function fetchData(url, cacheKey, cacheDuration) {
	// Check if the data is cached in the browser's storage
	const cachedData = localStorage.getItem(cacheKey);
	const cachedTime = localStorage.getItem(`${cacheKey}_time`);
	
	if (cachedData && cachedTime) {
		const currentTime = new Date().getTime();
		const elapsedTime = currentTime - parseInt(cachedTime, 10);
		
		if (elapsedTime < cacheDuration) {
			// If the cached data is still valid, return it
			return JSON.parse(cachedData);
		}
	}
	
	// If not cached or cache expired, make a request to the Azure Function API
	const response = await fetch(url);
	
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	
	const data = await response.text();
	
	// Cache the fetched data in the browser's storage
	localStorage.setItem(cacheKey, JSON.stringify(data));
	localStorage.setItem(`${cacheKey}_time`, new Date().getTime().toString());
	
	return data;
}

// Function to fetch the player scores HTML from the Azure Function
async function fetchPlayerScoresHtml() {
	const url = 'https://footyscores.azurewebsites.net/api/PlayerScores';
	const cacheKey = 'playerScoresHtml';
	const cacheDuration = 30000; // Cache locally for 30 seconds
	
	// Show the loading message
	const loadingElement = document.querySelector('#playerScores .loading');
	if (loadingElement) {
		loadingElement.style.display = 'block';
	}
	
	try {
		const html = await fetchData(url, cacheKey, cacheDuration);
		document.getElementById('playerScores').innerHTML = html;
	} catch (error) {
		console.error('Error fetching player scores:', error);
		document.getElementById('playerScores').innerHTML = '<p class="loading">Oh no. Better luck next time.</p>';
	}
	
	// Hide the loading message
	if (loadingElement) {
		loadingElement.style.display = 'none';
	}
}

// Function to handle the refresh button click
function handleRefreshClick(event) {
	if (event.target.tagName === 'H1') {
		// Clear the cached data
		localStorage.removeItem('playerScoresHtml');
		localStorage.removeItem('playerScoresHtml_time');
		
		// Fetch the latest data
		fetchPlayerScoresHtml();
	}
}

// Call the fetchPlayerScoresHtml function when the page loads
window.addEventListener('load', fetchPlayerScoresHtml);

// Attach the click event listener to the playerScores div
document.getElementById('playerScores').addEventListener('click', handleRefreshClick);