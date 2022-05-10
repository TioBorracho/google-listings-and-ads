/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import AppTooltip from '.~/components/app-tooltip';
import { glaData } from '.~/constants';
import isCampaignConverted from '.~/utils/isCampaignConverted';
import './name-campaign-cell.scss';

/**
 * Shows Tooltip {@link Notice}
 * providing information about the conversion status of PMax campaigns
 *
 *
 * @param {Object} props React props.
 * @param {string} props.name Campaign Name
 * @param {string} props.type Campaign type
 * @return {JSX.Element} {@link Notice} element with the info message and the link to the documentation.
 */
const NameCampaignCell = ( { type, name } ) => {
	if ( isCampaignConverted( glaData.adsCampaignConvertStatus, type ) ) {
		return (
			<div className="gla-reports__tooltip-campaing-name">
				<AppTooltip
					position="top right"
					text={ __(
						'This campaign has been upgraded to Performance Max',
						'google-listings-and-ads'
					) }
				>
					{ name }
				</AppTooltip>
			</div>
		);
	}

	return name;
};

export default NameCampaignCell;
