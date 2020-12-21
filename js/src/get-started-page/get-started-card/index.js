/**
 * External dependencies
 */
import {
	Card,
	Flex,
	FlexItem,
	FlexBlock,
	__experimentalText as Text,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Link } from '@woocommerce/components';
import classnames from 'classnames';
import { getNewPath } from '@woocommerce/navigation';

/**
 * Internal dependencies
 */
import { recordSetupMCEvent } from '../../utils/recordEvent';
import { ReactComponent as GoogleShoppingImage } from './image.svg';
import './index.scss';

const GetStartedCard = () => {
	const handleClick = () => {
		recordSetupMCEvent( 'get_started' );
	};

	return (
		<Card className="woocommerce-marketing-google-get-started-card">
			<Flex>
				<FlexBlock className="motivation-text">
					<Text variant="title.medium" className="title">
						{ __(
							'List your products on Google Shopping, for free',
							'google-listings-and-ads'
						) }
					</Text>
					<Text variant="body" className="description">
						{ __(
							'Integrate with Google’s Merchant Center to list your products for free on Google. Optionally, create paid Smart Shopping campaigns to boost your sales.',
							'google-listings-and-ads'
						) }
					</Text>
					<Link
						className={ classnames(
							'components-button',
							'is-primary'
						) }
						href={ getNewPath( {}, '/google/setup-mc' ) }
						onClick={ handleClick }
					>
						{ __( 'Get started', 'google-listings-and-ads' ) }
					</Link>
				</FlexBlock>
				<FlexItem className="motivation-image">
					<GoogleShoppingImage viewBox="0 0 416 394"></GoogleShoppingImage>
				</FlexItem>
			</Flex>
		</Card>
	);
};

export default GetStartedCard;
