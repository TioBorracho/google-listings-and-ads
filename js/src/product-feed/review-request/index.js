/**
 * External dependencies
 */
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import useAppSelectDispatch from '.~/hooks/useAppSelectDispatch';
import { REVIEW_STATUSES } from '.~/product-feed/review-request/review-request-statuses';
import ReviewRequestModal from '.~/product-feed/review-request/review-request-modal';
import ReviewRequestNotice from '.~/product-feed/review-request/review-request-notice';
import './index.scss';

const showNotice = ( status ) =>
	Object.keys( REVIEW_STATUSES ).includes( status );

const ReviewRequest = () => {
	const [ modalActive, setModalActive ] = useState( false );
	const { data, hasFinishedResolution } = useAppSelectDispatch(
		'getMCReviewRequest'
	);

	if ( ! hasFinishedResolution || ! showNotice( data.status ) ) {
		return null;
	}

	return (
		<div className="gla-review-request">
			<ReviewRequestModal
				data={ data }
				isActive={ modalActive }
				onClose={ () => {
					setModalActive( false );
				} }
			/>
			<ReviewRequestNotice
				data={ data }
				onRequestReviewClick={ () => setModalActive( true ) }
			/>
		</div>
	);
};

export default ReviewRequest;
