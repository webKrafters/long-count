module.exports = {
    collectCoverageFrom: [ 'src/**/*.ts' ],
    "coveragePathIgnorePatterns": [
        "<rootDir>/src/\\$global.ts",
        "<rootDir>/src/index.ts",
    ],
    detectOpenHandles: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    // transform: { '\\.tsx?$': 'ts-jest' }
};
