/**
 * Internal dependencies
 */
import selectWithText from './select-with-text-input';
import number from './number';

window.jQuery( function ( $ ) {
	'use strict';

	const init = () => {
		selectWithText( $ );
		number( $ );
	};

	$( '#woocommerce-product-data' ).on(
		'woocommerce_variations_loaded',
		init
	);
	$( document.body ).on( 'woocommerce_variations_added', init );
	init();
} );
