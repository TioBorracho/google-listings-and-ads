/**
 * Internal dependencies
 */
import {
	freeFields,
	paidFields,
	MISSING_FREE_LISTINGS_DATA,
} from '.~/data/utils';
import {
	getIdsFromQuery,
	aggregateIntervals,
	sumToPerformance,
	addBaseToPerformance,
} from './utils';

// Copied from https://github.com/woocommerce/woocommerce-admin/blob/b35156dcf17b44b3a81ea4b4528445b432917fd5/packages/navigation/src/test/index.js#L184-L221
describe( 'getIdsFromQuery', () => {
	it( 'if the given query is empty, should return an empty array', () => {
		expect( getIdsFromQuery( '' ) ).toEqual( [] );
	} );

	it( 'if the given query is undefined, should return an empty array', () => {
		expect( getIdsFromQuery( undefined ) ).toEqual( [] );
	} );

	it( 'if the given query is does not contain any coma-separated numbers, should return an empty array', () => {
		expect( getIdsFromQuery( 'foo123,bar,baz1.' ) ).toEqual( [] );
	} );

	describe( 'if the given query contains numbers', () => {
		it( 'should return an array of them', () => {
			expect( getIdsFromQuery( '77,8,-1' ) ).toEqual( [ 77, 8, -1 ] );
		} );
		it( 'should consider `0` a valid id', () => {
			expect( getIdsFromQuery( '0' ) ).toEqual( [ 0 ] );
			expect( getIdsFromQuery( '77,0,1' ) ).toEqual( [ 77, 0, 1 ] );
		} );
		it( 'should map floats to integers', () => {
			expect( getIdsFromQuery( '77,8.54' ) ).toEqual( [ 77, 8 ] );
		} );
		it( 'should ignore duplicates', () => {
			expect( getIdsFromQuery( '77,8,8' ) ).toEqual( [ 77, 8 ] );
			// Consider two floats that maps to the same integer a duplicate.
			expect( getIdsFromQuery( '77,8.5,8.4' ) ).toEqual( [ 77, 8 ] );
		} );
		it( 'should ignore non numbers entries in the coma-separated list', () => {
			expect( getIdsFromQuery( '77,,8,foo,null,9' ) ).toEqual( [
				77, 8, 9,
			] );
		} );
	} );
} );

describe( 'aggregateIntervals', () => {
	function toIntervals( ...tuples ) {
		return tuples.map( ( [ interval, ...values ] ) => ( {
			interval,
			subtotals: values.reduce(
				( acc, value, i ) => ( {
					...acc,
					[ paidFields[ i ] ]: value,
				} ),
				{}
			),
		} ) );
	}

	it( 'If both `intervals` parameters are not given, should return null', () => {
		expect( aggregateIntervals() ).toBeNull();
		expect( aggregateIntervals( null ) ).toBeNull();
		expect( aggregateIntervals( null, null ) ).toBeNull();
		expect( aggregateIntervals( undefined, null ) ).toBeNull();
	} );

	it( 'If one of `intervals` parameters is not given, should return another early', () => {
		const intervals = toIntervals();

		expect( aggregateIntervals( intervals ) ).toBe( intervals );
		expect( aggregateIntervals( null, intervals ) ).toBe( intervals );
	} );

	it( 'should sort aggregated intervals in ascending order of string code by `interval`', () => {
		const intervals1 = toIntervals(
			[ '2021-01' ],
			[ '2021-03' ],
			[ '2021-05' ],
			[ '2021-07' ]
		);
		const intervals2 = toIntervals(
			[ '2021-02' ],
			[ '2021-04' ],
			[ '2021-06' ],
			[ '2021-08' ]
		);

		const result = aggregateIntervals( intervals1, intervals2 );
		const expectedIntervals = toIntervals(
			[ '2021-01' ],
			[ '2021-02' ],
			[ '2021-03' ],
			[ '2021-04' ],
			[ '2021-05' ],
			[ '2021-06' ],
			[ '2021-07' ],
			[ '2021-08' ]
		);

		expectedIntervals.forEach( ( item, i ) => {
			expect( result[ i ] ).toMatchObject( item );
		} );
	} );

	it( "should merge two given intervals' items by the same `interval`, and the `subtotals` from the same `interval` items should be aggregated by summation of each its metric", () => {
		const intervals1 = toIntervals(
			[ '2021-01', 12, 34 ],
			[ '2021-02', 34, 56 ]
		);
		const intervals2 = toIntervals(
			[ '2021-01', 56, 78 ],
			[ '2021-02', 78, 90 ]
		);

		const result = aggregateIntervals( intervals1, intervals2 );
		const expectedIntervals = toIntervals(
			[ '2021-01', 68, 112 ],
			[ '2021-02', 112, 146 ]
		);

		expect( result ).toHaveLength( expectedIntervals.length );
		expectedIntervals.forEach( ( item, i ) => {
			expect( result[ i ] ).toMatchObject( item );
		} );
	} );

	it( "should merge two given intervals' items to a union result by `interval`", () => {
		const intervals1 = toIntervals( [ '2021-01', 12 ] );
		const intervals2 = toIntervals( [ '2021-02', 34 ] );

		const result = aggregateIntervals( intervals1, intervals2 );
		const expectedIntervals = toIntervals(
			[ '2021-01', 12 ],
			[ '2021-02', 34 ]
		);

		expect( result ).toHaveLength( expectedIntervals.length );
		expectedIntervals.forEach( ( item, i ) => {
			expect( result[ i ] ).toMatchObject( item );
		} );
	} );

	it( 'When any metric in `paidFields` does not exist in `subtotals`, should fill its value with 0', () => {
		const intervals1 = toIntervals( [ '2021-01', , 1, , 3 ] );
		const intervals2 = toIntervals( [ '2021-01', , , 2, , 4 ] );

		const result = aggregateIntervals( intervals1, intervals2 );
		const expectedIntervals = toIntervals( [ '2021-01', 0, 1, 2, 3, 4 ] );

		expectedIntervals.forEach( ( item, i ) => {
			expect( result[ i ] ).toMatchObject( item );
		} );
	} );
} );

describe( 'sumToPerformance', () => {
	function toTotals( fields, ...values ) {
		return values.reduce(
			( acc, value, i ) => ( {
				...acc,
				[ fields[ i ] ]: value,
			} ),
			{}
		);
	}

	it( 'When only paid `totals` is given, should still map it to performance data', () => {
		const paid = toTotals( paidFields, 123 );
		const free = undefined;

		const performance = sumToPerformance( paid, free );

		expect( performance ).toMatchObject( {
			[ paidFields[ 0 ] ]: {
				value: 123,
				delta: null,
				missingFreeListingsData: MISSING_FREE_LISTINGS_DATA.NONE,
			},
		} );
	} );

	it( 'When paid `totals` is not given, should still be able to calculate performance data', () => {
		const paid = undefined;
		const free = toTotals( freeFields, 456 );

		const performance = sumToPerformance( paid, free, freeFields );

		expect( performance ).toMatchObject( {
			[ freeFields[ 0 ] ]: {
				value: 456,
				delta: null,
				missingFreeListingsData: MISSING_FREE_LISTINGS_DATA.NONE,
			},
		} );
	} );

	describe( 'When paid and free `totals` are given', () => {
		it( 'should sum the same fields from paid and free `totals` to performance', () => {
			const sameFields = [ 'ranks' ];
			const paid = toTotals( sameFields, 123 );
			const free = toTotals( sameFields, 456 );

			const performance = sumToPerformance( paid, free, sameFields );

			expect( performance ).toMatchObject( {
				[ sameFields[ 0 ] ]: {
					value: 579,
					delta: null,
					missingFreeListingsData: MISSING_FREE_LISTINGS_DATA.NONE,
				},
			} );
		} );

		it( 'When a paid field is not (yet) available in API, should flag the data is not available', () => {
			const paidOnlyFields = [ 'ranks' ];
			const expectedFreeFields = [ 'views' ];
			const paid = toTotals( paidOnlyFields, 1 );
			const free = toTotals( expectedFreeFields, 1 );

			const performance = sumToPerformance(
				paid,
				free,
				expectedFreeFields
			);

			expect( performance ).toMatchObject( {
				[ paidOnlyFields[ 0 ] ]: {
					missingFreeListingsData:
						MISSING_FREE_LISTINGS_DATA.FOR_METRIC,
				},
			} );
		} );

		it( `When an expected free field doesn't exist, should flag anticipated data is not returned from API`, () => {
			const expectedFields = [ 'ranks' ];
			const paid = toTotals( expectedFields, 1 );
			const free = toTotals( expectedFields );

			const performance = sumToPerformance( paid, free, expectedFields );

			expect( performance ).toMatchObject( {
				[ expectedFields[ 0 ] ]: {
					missingFreeListingsData:
						MISSING_FREE_LISTINGS_DATA.FOR_REQUEST,
				},
			} );
		} );
	} );
} );

describe( 'addBaseToPerformance', () => {
	it( 'When `performance` is still in loading, should return an empty object', () => {
		// In our use cases, the passed-in `performance` in loading status would be an empty object.
		const performance = {};
		const base = { clicks: {}, sales: {} };

		const result = addBaseToPerformance( performance, base );

		expect( result ).toEqual( {} );
	} );

	it( 'When `performance` is loaded, should iterate fields according to its data properties', () => {
		const performance = { clicks: {}, sales: {} };
		const base = {};

		const result = addBaseToPerformance( performance, base );

		expect( result ).toHaveProperty( 'clicks' );
		expect( result ).toHaveProperty( 'sales' );
	} );

	it( 'should calculate the final performance data', () => {
		const performance = {
			clicks: { value: 13, missingFreeListingsData: 0 },
			sales: { value: 5, missingFreeListingsData: 2 },
		};
		const base = {
			clicks: { value: 10 },
			sales: { value: 10 },
		};

		const result = addBaseToPerformance( performance, base );

		expect( result ).toEqual( {
			clicks: {
				value: 13,
				prevValue: 10,
				delta: 30,
				missingFreeListingsData: 0,
			},
			sales: {
				value: 5,
				prevValue: 10,
				delta: -50,
				missingFreeListingsData: 2,
			},
		} );
	} );
} );
