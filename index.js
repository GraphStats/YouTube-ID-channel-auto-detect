const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = "https://mixerno.space/api/youtube-channel-counter/search/";
const OUTPUT_FILE = "youtube_channel.txt";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                  "AppleWebKit/537.36 (KHTML, like Gecko) " +
                  "Chrome/114.0.0.0 Safari/537.36"
};

const lock = { locked: false };

function loadExistingIds() {
    if (!fs.existsSync(OUTPUT_FILE)) {
        return new Set();
    }
    const data = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    return new Set(data.split('\n').filter(line => line.trim()));
}

function generateRandomQuery() {
    const length = Math.floor(Math.random() * 15) + 1;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function fetchChannelIds(query) {
    try {
        const response = await axios.get(API_URL + query, { headers: HEADERS, timeout: 5000 });
        if (response.status === 200) {
            return response.data.list ? response.data.list.map(item => item[2]) : [];
        }
    } catch (error) {
        return [];
    }
    return [];
}

function appendNewIds(newIds, existingIds) {
    let added = 0;
    if (!lock.locked) {
        lock.locked = true;
        const fileStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a', encoding: 'utf-8' });
        newIds.forEach(cid => {
            if (!existingIds.has(cid)) {
                fileStream.write(cid + "\n");
                existingIds.add(cid);
                added++;
                console.log(`✅ Ajouté : ${cid} | ${existingIds.size}`);
            }
        });
        fileStream.end();
        lock.locked = false;
    }
    return added;
}

async function worker(existingIds) {
    const query = generateRandomQuery();
    const ids = await fetchChannelIds(query);
    if (ids.length > 0) {
        return appendNewIds(ids, existingIds);
    }
    return 0;
}

async function main() {
    const existingIds = loadExistingIds();
    console.log(`📂 ${existingIds.size} ID(s) déjà dans le fichier.`);

    let totalAdded = 0;
    const promises = [];
    while (true) {
        for (let i = 0; i < 15; i++) {
            promises.push(worker(existingIds));
        }
        const results = await Promise.all(promises);
        totalAdded += results.reduce((acc, val) => acc + val, 0);
        promises.length = 0; // Clear the array
    }
}

main();