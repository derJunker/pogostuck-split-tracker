import path from "path";
import {app} from "electron";
import {PogoLevel} from "../types/pogo-index-mapping";
import fs from "fs";
import {defaultMappings} from "./data/default-mappings";
import {PogoNameMappings} from "./data/pogo-name-mappings";
import log from "electron-log/main";

const mappingsPath = path.join(app.getPath("userData"), "mappings.json");

export function initMappings(): PogoNameMappings {
    // currently always true to force default mappings
    // if (!fs.existsSync(mappingsPath) || true) {
        log.debug("No mappings path defined, using default mappings");
        return new PogoNameMappings(defaultMappings);
    // }
    // else {
    //     try {
    //         const data = fs.readFileSync(mappingsPath, "utf-8");
    //         const parsed = JSON.parse(data);
    //         if (Array.isArray(parsed)) {
    //             console.log("Loaded Split Mappings from file");
    //             return parsed;
    //         } else {
    //             console.log("Something went wrong loading your Split Mappings, expected an array but got:", typeof parsed);
    //             return defaultMappings;
    //         }
    //     } catch {
    //         console.log(`Something went wrong loading your Split Mappings from ${mappingsPath}, using default mappings instead.`);
    //         return defaultMappings;
    //     }
    // }
}
