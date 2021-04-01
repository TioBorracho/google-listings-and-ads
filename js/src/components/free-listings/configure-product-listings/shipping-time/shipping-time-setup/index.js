/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { CheckboxControl } from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';

/**
 * Internal dependencies
 */
import useShippingTimes from '.~/hooks/useShippingTimes';
import AppSpinner from '.~/components/app-spinner';
import AppDocumentationLink from '.~/components/app-documentation-link';
import VerticalGapLayout from '.~/components/vertical-gap-layout';
import ShippingCountriesForm from './countries-form';
import './index.scss';

/**
 * CountryCode
 *
 * @typedef {string} CountryCode
 */

/**
 * Form control to edit shipping rate settings.
 *
 * @param {Object} props React props.
 * @param {Object} props.formProps Form props forwarded from `Form` component, containing `offers_free_shipping` property.
 * @param {Array<CountryCode>} props.selectedCountryCodes Array of country codes of all audience countries.
 */
const ShippingTimeSetup = ( { formProps, selectedCountryCodes } ) => {
	const { getInputProps } = formProps;
	const {
		loading: loadingShippingTimes,
		data: shippingTimes,
	} = useShippingTimes();

	if ( ! selectedCountryCodes || loadingShippingTimes ) {
		return <AppSpinner />;
	}

	return (
		<div className="gla-shipping-time-setup">
			<VerticalGapLayout>
				<ShippingCountriesForm
					shippingTimes={ shippingTimes }
					selectedCountryCodes={ selectedCountryCodes }
				/>
				<CheckboxControl
					label={ createInterpolateElement(
						__(
							'I allow Google to collect and calculate my shipping times for more accurate estimates. <link>Learn more</link>',
							'google-listings-and-ads'
						),
						{
							link: (
								<AppDocumentationLink
									context="setup-mc-shipping-time"
									linkId="shipping-time-allow-google-data-collection"
									href="https://www.google.com/retail/solutions/merchant-center/"
								/>
							),
						}
					) }
					{ ...getInputProps( 'share_shipping_time' ) }
				/>
			</VerticalGapLayout>
		</div>
	);
};

export default ShippingTimeSetup;
