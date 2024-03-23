import { getValidDelayTypeName } from '../../timer/helpers/index';

import * as intArray from '../uint8array/index';

import * as intXl from '.';

const testVals = {
    A: [ 1, 2, 3, 4, 5 ],
    AL: [ 1, 2, 3, 4, 5, 8, 9 ],
    B: [ 9, 9, 5, 1, 0 ],
    BL: [ 9, 9, 5, 1, 0, 0, 0 ],
    C: [ 0, 0, 0, 4, 8 ],
    CL: [ 0, 0, 0, 4, 8, 1, 5 ],
    D: [ 3, 0, 0, 0, 2 ]
}

jest.mock( '../../timer/helpers/index', () => ({
    getValidDelayTypeName: jest.fn()
}) );

jest.mock( '../uint8array/index', () => ({
    toMyInteger: jest.fn(),
    fromInteger: jest.fn()
}) );

describe( 'intXl module', () => {
    23,33-34
} );