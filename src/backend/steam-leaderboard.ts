const APP_ID = 688130;
const steamID = '76561198272207806'

const url = `http://steamcommunity.com/profiles/${steamID}/stats/${APP_ID}/?xml=1`;

fetch(url)
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Error fetching leaderboard data:', error);
    });
