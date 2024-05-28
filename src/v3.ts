import * as process from "node:process";

import express from "express";
import axios from 'axios';
import dotenv from "dotenv";
import { Route } from "@/types";

import * as metadata from "./assets/route-data.json";
import * as valid_assets from "./assets/valid_assets.json";
import * as path from "node:path";

dotenv.config();
const router = express.Router();
const validAssets = new Set(valid_assets.validAssets);
const routeImages: {[k: string]: string} = metadata.routeImages;

const API_KEY = process.env.MBUS_API_KEY;
if (API_KEY === undefined) {
    throw new Error("MBus API key not set.");
}

const curBusPositions: {
    buses: any[]
} = {
    "buses": []
}

const cachedRoutes: {[k: string]: any} = {};
const validRoutes = new Set();
let curRouteSelections = {};
const routes = ["BB", "CN", "CS", "CSX", "DD", "MX", "NE", "NW", "NX", "OS", "NES", "WS", "WX"];

const message = {id: "gradamatation", title: "Congrats Grads 🥳", message: "Congrats to everyone who is gradamatating! Enjoy some grad hats on the buses, and don't forget to celebrate!", buildVersion: '99'}

const client = axios.create({
    baseURL: 'https://mbus.ltp.umich.edu/bustime/api/v3/',
    params: {
        key: API_KEY,
        format: 'json'
    }
});

const getBuses = async () => {
    const getChunk = async (routes: string[]) => {
        const res = await client.get('/getvehicles', {
            params: {
                requestType: 'getvehicles',
                rt: routes.join(',')
            }
        });

        if ('bustime-response' in res.data && 'vehicle' in res.data['bustime-response']) {
            return res.data['bustime-response']['vehicle'];
        }
        
        return [];
    }

    const chunks = []
    for (let i = 0; i < routes.length; i += 10) {
        chunks.push(routes.slice(i, i + 10));
    }

    let buses = await Promise.all(chunks.map(getChunk));
    buses = buses.flat();

    return buses;
}

const updateBusPositions = async () => {
    curBusPositions.buses = await getBuses();
}

router.get('/getStopPredictions/:stopId', async (req, res) => {
    const { stopId } = req.params;

    const stopPreds = await client.get('/getpredictions', {
        params: {
            requestType: 'getpredictions',
            locale: 'en',
            stpid: stopId,
            rt: routes.join(','),
            rtpidatafeed: 'bustime',
            top: 4,
        }
    });

    res.send(stopPreds.data);
});


const addToCachedRoutes = async (rt: string) => {
    try {
        const res = await client.get('/getpatterns', {
            params: {
                requestType: 'getpatterns',
                rtpidatafeed: 'bustime',
                rt: rt
            }
        });

        if (res.data['bustime-response'] && res.data['bustime-response']['ptr']) {
            cachedRoutes[rt] = res.data['bustime-response']['ptr'];
        }
    } catch (e) {
        console.log(`Error while getting routes: ${e}`);
    }
}

const getSelectableRoutes = () => {
    axios.get(`https://mbus.ltp.umich.edu/bustime/api/v3/getroutes?requestType=getroutes&locale=en&key=${API_KEY}&format=json`).then(res => {
        curRouteSelections = res.data;
        validRoutes.clear();
        try {
            res.data['bustime-response']['routes'].forEach((e: Route) => {
                validRoutes.add(e['rt']);
                addToCachedRoutes(e['rt']);
            });
        } catch (e) {

        }
    })
        .catch((err) => console.log(`Error while getting selectable routes: ${err}`));
}

setInterval(updateBusPositions, 7500);
setInterval(getSelectableRoutes, 60000);
getSelectableRoutes();


router.get('/getBusPositions', (req, res) => {
    res.send(curBusPositions);
});

router.get('/getVehiclePositions', (req, res) => {
    res.send(curBusPositions);
});

router.get('/getSelectableRoutes', (req, res) => {
    res.send(curRouteSelections);
});

router.get('/getAllRoutes', (req, res) => {
    res.send({routes: cachedRoutes});
});

router.get('/getVehicleImage/:route', (req, res) => {
   const { route } = req.params;
   const isColorblind = req.query.colorblind === "Y";

   const dirname = import.meta.dirname;

   const assetPath = path.join(dirname, 'assets');
   const colorBlindPath = path.join(assetPath, 'colorblind');
   const regularPath = path.join(assetPath, 'grad-24');

    if (!route || !(route in routeImages)) {
        res.sendFile(path.join(assetPath, 'bus_CN.png'));
        return res.sendStatus(400);
    }


    if (isColorblind) {
        res.sendFile(path.join(colorBlindPath, routeImages[route]));
    } else {
        res.sendFile(path.join(regularPath, routeImages[route]));
    }
});

router.get('/getRouteInfoVersion', (req, res) => {
    res.send(JSON.stringify({version: metadata.metadata.version}));
});

router.get('/getRouteInformation', (req, res) => {
    const { isColorblind } = req.query;
    const infoToSend = {
        routeIdToName: metadata.routeIdToName,
        routeImages: metadata.routeImages,
        metadata: metadata.metadata,
        routeColors: {}
    }
    if (isColorblind === "Y") {
        infoToSend.routeColors = metadata.routeColorsColorblind;
    } else {
        infoToSend.routeColors = metadata.routeColorsRegular;
    }
    res.send(infoToSend);
});

router.get('/getUpdateNotes', (req, res) => {
    res.send({message: "- ·Support new routes\n- ·Added route names to arrivals at shared stops\n- ·General improvements", version: "6"});
});

router.get('/getBusPredictions/:busId', (req, res) => {
    axios.get(`https://mbus.ltp.umich.edu/bustime/api/v3/getpredictions?requestType=getpredictions&locale=en&vid=${req.params.busId}&top=4&tmres=s&rtpidatafeed=bustime&key=${API_KEY}&format=json&xtime=1626028950462`).then(apiRes => {
        res.send(apiRes.data);
    }).catch(err => {
        console.log(err);
        res.sendStatus(500);
    });
});

router.get('/get-startup-messages', (req, res) => {
    res.send(JSON.stringify(message));
});

export default router;