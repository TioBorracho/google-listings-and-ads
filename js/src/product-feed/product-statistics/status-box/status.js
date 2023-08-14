/**
 * External dependencies
 */
import { Flex, FlexItem } from '@wordpress/components';

/**
 * Renders a status line. With a title, an icon and a description for the status
 *
 * @param {Object} props The properties for this component
 * @param {JSX.Element} props.icon The icon to be rendered
 * @param {string} props.title Title for this status
 * @param {string} props.label Label for this status
 * @param {string} props.description Description explaining the label
 * @param {string} [props.className] Custom className for the component
 * @return {JSX.Element} The Status component
 */
const Status = ( { icon, title, label, description, className } ) => {
	return (
		<Flex className={ className } justify="normal" gap={ 1 }>
			<FlexItem>{ title }</FlexItem>
			<FlexItem className="gla-status__icon">{ icon }</FlexItem>
			<FlexItem>
				<span className="gla-status__label">{ label }</span>
				<span className="gla-status__description">{ description }</span>
			</FlexItem>
		</Flex>
	);
};

export default Status;
