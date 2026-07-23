#!/usr/bin/env node
/**
 * prebuild — prepares package.json for ng-packagr.
 *
 * Adapted from the upstream script (MIT). One difference: upstream derives the package
 * directory from the script's own location, because the script lives inside the package.
 * This one takes it from the `PKG_DIR` environment variable, so a single set of build
 * scripts serves every package in the workspace instead of being copied per package.
 *
 * Usage: PKG_DIR=packages/angulux INPUT_DIR=src/ OUTPUT_DIR=dist/ node tools/build/prebuild.mjs
 */

import path from 'path';
import fs from 'fs-extra';
import { createPackageJson_For_NG_Packager, removeBuild, resolvePath } from './build-helper.mjs';

for (const k of ['PKG_DIR', 'INPUT_DIR', 'OUTPUT_DIR']) {
    if (!process.env[k]) {
        console.error(`✗ prebuild: missing environment variable ${k}`);
        process.exit(1);
    }
}

const { __root, INPUT_PATH } = resolvePath(import.meta.url);
const localPackageJson = path.resolve(__root, 'package.json');

if (!fs.existsSync(localPackageJson)) {
    console.error(`✗ prebuild: ${localPackageJson} not found`);
    process.exit(1);
}

removeBuild(import.meta.url);
createPackageJson_For_NG_Packager(localPackageJson, INPUT_PATH);

console.log(`✓ prebuild: generated ${path.join(INPUT_PATH, 'package.json')} for ng-packagr`);
