/**
 * External dependencies
 */
import { useState, createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { CardDivider } from '@wordpress/components';

/**
 * Internal dependencies
 */
import AccountCard, { APPEARANCE } from '.~/components/account-card';
import AppButton from '.~/components/app-button';
import AppDocumentationLink from '.~/components/app-documentation-link';
import ContentButtonLayout from '.~/components/content-button-layout';
import LoadingLabel from '.~/components/loading-label';
import Section from '.~/wcdl/section';
import Subsection from '.~/wcdl/subsection';
import useApiFetchCallback from '.~/hooks/useApiFetchCallback';
import useDispatchCoreNotices from '.~/hooks/useDispatchCoreNotices';
import useGoogleAdsAccount from '.~/hooks/useGoogleAdsAccount';
import useEventPropertiesFilter from '.~/hooks/useEventPropertiesFilter';
import AdsAccountSelectControl from './ads-account-select-control';
import { useAppDispatch } from '.~/data';
import { FILTER_ONBOARDING } from '.~/utils/tracks';
import './index.scss';

/**
 * Clicking on the button to connect an existing Google Ads account.
 *
 * @event gla_ads_account_connect_button_click
 * @property {number} id The account ID to be connected.
 * @property {string} [context] Indicates the place where the button is located.
 * @property {string} [step] Indicates the step in the onboarding process.
 */

/**
 * @fires gla_ads_account_connect_button_click when "Connect" button is clicked.
 * @fires gla_documentation_link_click with `{ context: 'setup-ads-connect-account', link_id: 'connect-sub-account', href: 'https://support.google.com/google-ads/answer/6139186' }`
 * @param {Object} props React props
 * @return {JSX.Element} {@link AccountCard} filled with content.
 */
const ConnectAds = ( props ) => {
	const { accounts, onCreateNew = () => {} } = props;
	const [ value, setValue ] = useState();
	const [ isLoading, setLoading ] = useState( false );
	const [ fetchConnectAdsAccount ] = useApiFetchCallback( {
		path: `/wc/gla/ads/accounts`,
		method: 'POST',
		data: { id: value },
	} );
	const { refetchGoogleAdsAccount } = useGoogleAdsAccount();
	const getEventProps = useEventPropertiesFilter( FILTER_ONBOARDING );
	const { createNotice } = useDispatchCoreNotices();
	const { fetchGoogleAdsAccountStatus } = useAppDispatch();

	/**
	 * Boolean to display blurb message to advise users
	 * to connect Google Ads sub-account and not manager account.
	 *
	 * The message is displayed when there are more than one Google Ads account.
	 */
	const displayMessage = accounts.length > 1;

	const handleConnectClick = async () => {
		if ( ! value ) {
			return;
		}

		setLoading( true );
		try {
			await fetchConnectAdsAccount();
			await fetchGoogleAdsAccountStatus();
			await refetchGoogleAdsAccount();
		} catch ( error ) {
			setLoading( false );
			createNotice(
				'error',
				__(
					'Unable to connect your Google Ads account. Please try again later.',
					'google-listings-and-ads'
				)
			);
		}
		// Wait for the upper layer component to switch to connected account card,
		// so here doesn't reset the `isLoading` to false.
	};

	return (
		<AccountCard
			className="gla-connect-ads"
			alignIcon="top"
			appearance={ APPEARANCE.GOOGLE_ADS }
		>
			<CardDivider />
			<Section.Card.Body>
				<Subsection.Title>
					{ __(
						'Select an existing account',
						'google-listings-and-ads'
					) }
				</Subsection.Title>
				{ displayMessage && (
					<Subsection.Body>
						{ createInterpolateElement(
							__(
								'If you manage multiple sub-accounts in Google Ads, please connect the relevant sub-account, not a manager account. <link>Learn more</link>',
								'google-listings-and-ads'
							),
							{
								link: (
									<AppDocumentationLink
										context="setup-ads-connect-account"
										linkId="connect-sub-account"
										href="https://support.google.com/google-ads/answer/6139186"
									/>
								),
							}
						) }
					</Subsection.Body>
				) }
				<ContentButtonLayout>
					<AdsAccountSelectControl
						accounts={ accounts }
						value={ value }
						onChange={ setValue }
					/>
					{ isLoading ? (
						<LoadingLabel
							text={ __(
								'Connecting…',
								'google-listings-and-ads'
							) }
						/>
					) : (
						<AppButton
							isSecondary
							disabled={ ! value }
							eventName="gla_ads_account_connect_button_click"
							eventProps={ getEventProps( {
								id: Number( value ),
							} ) }
							onClick={ handleConnectClick }
						>
							{ __( 'Connect', 'google-listings-and-ads' ) }
						</AppButton>
					) }
				</ContentButtonLayout>
			</Section.Card.Body>
			<Section.Card.Footer>
				<AppButton
					isTertiary
					disabled={ isLoading }
					onClick={ onCreateNew }
				>
					{ __(
						'Or, create a new Google Ads account',
						'google-listings-and-ads'
					) }
				</AppButton>
			</Section.Card.Footer>
		</AccountCard>
	);
};

export default ConnectAds;
