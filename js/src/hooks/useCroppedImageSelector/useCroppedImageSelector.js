/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useCallback, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './useCroppedImageSelector.scss';

/**
 * @typedef {import('.~/hooks/types.js').ImageMedia} ImageMedia
 */

/**
 * @typedef {Object} CroppedImageSelector
 * @property {(preTickedId: number) => void} openSelector Function to open the selector modal.
 */

/**
 * Calculates the maximum cropping size according to the fixed aspect ratio.
 *
 * @param {number} width The image width.
 * @param {number} height The image height.
 * @param {number} widthScale The scale of width.
 * @param {number} heightScale The scale of height.
 * @return {number[]} The tuple of cropped width and height.
 */
export function calcMaxCroppingByFixedRatio(
	width,
	height,
	widthScale,
	heightScale
) {
	const ratio = widthScale / heightScale;

	if ( width / height > ratio ) {
		width = Math.round( height * ratio );
	} else {
		height = Math.round( width / ratio );
	}

	return [ width, height ];
}

/**
 * Returns the options to be used with the jQuery plugin `imgAreaSelect` to specify the
 * initial selection.
 *
 * @param {number} width The image width.
 * @param {number} height The image height.
 * @param {number} minWidth The minimum width and also the width to be calculated as the aspect ratio.
 * @param {number} minHeight The minimum height and also the height to be calculated as the aspect ratio.
 * @return {Object} The options to be used with the jQuery plugin `imgAreaSelect`.
 */
export function getSelectionOptions( width, height, minWidth, minHeight ) {
	const [ croppedWidth, croppedHeight ] = calcMaxCroppingByFixedRatio(
		...arguments
	);
	const x1 = ( width - croppedWidth ) / 2;
	const y1 = ( height - croppedHeight ) / 2;

	return {
		// Shows the resize handles.
		handles: true,
		// Returns the `imgAreaSelect` instance instead of jQuery object.
		// Ref:
		// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/cropper.js#L83
		// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/cropper.js#L60
		instance: true,
		// Don't start a new selection when clicking outside the selection area.
		persistent: true,
		imageWidth: width,
		imageHeight: height,
		minWidth,
		minHeight,
		x1,
		y1,
		x2: x1 + croppedWidth,
		y2: y1 + croppedHeight,
		aspectRatio: `${ minWidth }:${ minHeight }`,
	};
}

/**
 * Calculates the percent error between the actual aspect ratio and the expected aspect ratio.
 *
 * @param {number} width The actual width.
 * @param {number} height The actual height.
 * @param {number} expectedWidth The expected width.
 * @param {number} expectedHeight The expected height.
 * @return {number} The percent error of aspect ratio.
 */
export function calcRatioPercentError(
	width,
	height,
	expectedWidth,
	expectedHeight
) {
	const imageRatio = width / height;
	const expectedRatio = expectedWidth / expectedHeight;
	const errorRatio =
		imageRatio > expectedRatio
			? imageRatio / expectedRatio
			: expectedRatio / imageRatio;

	return ( errorRatio - 1 ) * 100;
}

function resetSelectionArea( controller, options, img ) {
	// Temporarily force the preview <img> size to a size that tolerates the decimal precision bug.
	const computedStyle = getComputedStyle( img );
	const { style } = img;
	const styleMap = new Map();

	[ 'width', 'height' ].forEach( ( name ) => {
		const valueNumber = parseFloat( computedStyle[ name ] );

		if (
			Number.isInteger( valueNumber ) ||
			! Number.isFinite( valueNumber )
		) {
			return;
		}

		styleMap.set( name, [
			style.getPropertyValue( name ),
			style.getPropertyPriority( name ),
		] );

		const tolerantValue = `${ Math.ceil( valueNumber ) }px`;
		style.setProperty( name, tolerantValue );
	} );

	// Reset the selection area.
	const { x1, y1, x2, y2 } = options;
	controller.imgSelect.setSelection( x1, y1, x2, y2 );
	controller.imgSelect.update();

	// Resume the preview <img> size.
	styleMap.forEach( ( [ value, priority ], name ) => {
		style.setProperty( name, value, priority );
	} );
}

/**
 * Hook for opening a modal to select images with fixed aspect ratio via
 * WordPress Media library. It will request cropping when the size of the
 * ticked image doesn't match the given aspect ratio.
 *
 * @param {Object} options
 * @param {number} options.minWidth The minimum width and also the width to be calculated as the aspect ratio.
 * @param {number} options.minHeight The minimum height and also the height to be calculated as the aspect ratio.
 * @param {number} options.suggestedWidth The suggested width showing on the modal.
 * @param {number} options.suggestedHeight The suggested height showing on the modal.
 * @param {(image: ImageMedia) => void} options.onSelect Callback when an image is selected.
 * @param {(image: ImageMedia) => void} options.onDelete Callback when an image is deleted.
 * @param {number} [options.ratioPercentError=1] The percent error of the aspect ratio.
 * @return {CroppedImageSelector} The handle of this hook.
 */
export default function useCroppedImageSelector( {
	minWidth,
	minHeight,
	suggestedWidth,
	suggestedHeight,
	onSelect,
	onDelete,
	ratioPercentError = 1,
} ) {
	const callbackRef = useRef( {} );
	callbackRef.current.onSelect = onSelect;
	callbackRef.current.onDelete = onDelete;

	const openSelector = useCallback(
		( preTickedId ) => {
			const { media } = wp;
			const sizeErrorMessage = sprintf(
				// translators: 1: Minimum width, 2: Minimum height.
				__(
					'Image size needs to be at least %1$d x %2$d',
					'google-listings-and-ads'
				),
				minWidth,
				minHeight
			);

			// Will be called by the controller of the parent class of CustomizeImageCropper. Ref:
			// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/customize-image-cropper.js#L14
			// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/cropper.js#L65
			// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/cropper.js#L48-L54
			const imgSelectOptions = ( attachment, controller ) => {
				const width = attachment.get( 'width' );
				const height = attachment.get( 'height' );
				const args = [ width, height, minWidth, minHeight ];
				const options = getSelectionOptions( ...args );

				if ( calcRatioPercentError( ...args ) < ratioPercentError ) {
					controller.set( 'canSkipCrop', true );

					const setCropButtonDisabled = ( disabled ) => {
						controller.frame.toolbar
							.get()
							.get( 'insert' )
							.model.set( 'disabled', disabled );
					};
					// If the crop can be skipped, then since the default is the maximum selection during
					// initialization, it also means the initial state of crop button should be disabled.
					// And, it needs to wait for the toolbar view of Cropper (CustomizeImageCropper) controller
					// to be created in order to disable the button.
					// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/cropper.js#L69
					controller.cropperView.once( 'image-loaded', () => {
						setCropButtonDisabled( true );
					} );

					options.onSelectEnd = ( _, selection ) => {
						setCropButtonDisabled(
							selection.width === options.imageWidth &&
								selection.height === options.imageHeight
						);
					};
				}

				options.onSelectChange = ( img, selection ) => {
					// The jQuery plugin `imgAreaSelect` has a bug that the coordinates, width and height
					// in the initial `selection` are miscalculated as `NaN` when the preview <img> is scaled
					// to have a decimal point that >= 0.5 in width or height. For example:
					// - The size of the image to be cropped is 800 x 799,
					// - and the window size of the web page doesn't have enough space so the rendering
					//   <img class="crop-image"> is scaled to 759.938 x 759.
					//
					// This causes the crop selection area not to appear and further skips the crop processing.
					// Therefore, it uses a workaround to force the selection area reset.
					//
					// Ref:
					// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/_enqueues/vendor/imgareaselect/jquery.imgareaselect.js#L262-L263
					//   The initial coordinates are rounded. Take the same example above, the maximum
					//   `options.x2` 800 may be scaled to 759.938 as well and then be rounded to 760.
					// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/_enqueues/vendor/imgareaselect/jquery.imgareaselect.js#L327-L328
					//   It calls `adjust` function initially and checks the boundaries of the selection area.
					// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/_enqueues/vendor/imgareaselect/jquery.imgareaselect.js#L597-L598
					//   The `adjust` calls `doResize`, but at this moment, the internal variables `x1` and `y1`
					//   are still `undefined` and cause all coordinates to be set to `NaN`.
					if ( Number.isNaN( selection.width ) ) {
						// Yield to wait for the `imgSelect` instance to be assigned to controller.
						setTimeout( () =>
							resetSelectionArea( controller, options, img )
						);
					}
				};

				return options;
			};

			// Ref:
			// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/_enqueues/wp/media/models.js#L36
			// - https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/frame/select.js
			const frame = media( {
				// `button` is the options for Toolbar.Select view.
				// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/frame/select.js#L178
				button: {
					text: __( 'Select', 'google-listings-and-ads' ),
					// Don't close the frame after clicking the "Select" button.
					close: false,
				},
				// `states` option indicates the steps of the workflow in the frame. Each state is implemented
				// as a controller for compositing other views to be rendered as the content of the frame.
				states: [
					// Library controller is for choosing an image.
					// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/library.js
					new media.controller.Library( {
						title: __(
							'Select or upload image',
							'google-listings-and-ads'
						),
						// The following are options for AttachmentsBrowser view.
						// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/views/frame/select.js#L145-L151
						library: media.query( { type: 'image' } ),
						date: false,
						suggestedWidth,
						suggestedHeight,
					} ),
					// CustomizeImageCropper controller is for cropping an image via the WP core AJAX handler "crop-image".
					// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/customize-image-cropper.js
					new media.controller.CustomizeImageCropper( {
						imgSelectOptions,
						// Ignores the adjustment of the flexible sides.
						// Ref: https://github.com/WordPress/wordpress-develop/blob/5.9.0/src/js/media/controllers/customize-image-cropper.js#L39-L40
						control: { params: {} },
					} ),
				],
			} );

			function handlePreselect( library ) {
				if ( ! preTickedId ) {
					return;
				}
				const attachment = library.get( preTickedId );
				if ( attachment ) {
					frame.state().get( 'selection' ).reset( [ attachment ] );
				}
			}

			function handleImageDeleted( attachment ) {
				callbackRef.current.onDelete( attachment );
			}

			/**
			 * Handler for checking if the width and height of the ticked image are valid,
			 * and for toggling the error message and the disabled state of the "Select" button
			 * in the toolbar.
			 */
			function handleSelectionToggle() {
				// Workaround to update the disabled state of button after uploading a new image
				// since `toolbar` will be triggered the refresh event at the end, so this function
				// must be called after that.
				if ( this === frame ) {
					setImmediate( handleSelectionToggle );
					return;
				}

				const selection = frame.state().get( 'selection' );
				const toolbar = frame.toolbar.get();

				let invalidSize;

				if ( selection.length ) {
					const { width, height } = selection.first().toJSON();
					invalidSize = width < minWidth || height < minHeight;
				}

				const primaryBlock = toolbar.primary.el;

				if ( invalidSize ) {
					primaryBlock.dataset.errorMessage = sizeErrorMessage;
					primaryBlock.classList.add( 'gla-decorated-error-message' );
					toolbar.get( 'select' ).model.set( 'disabled', true );
				} else {
					delete primaryBlock.dataset.errorMessage;
				}
			}

			function handleSelectButtonClick() {
				frame.setState( 'cropper' );
			}

			function handleSelectedImage( image ) {
				// 'skippedcrop' will pass an attachment model.
				if ( image instanceof media.model.Attachment ) {
					image = image.toJSON();
				}
				callbackRef.current.onSelect( image );
			}

			function handleClose() {
				// Remove all callbacks bound with the same context.
				// Ref: https://backbonejs.org/#Events-off
				const libraryModel = frame.state( 'library' );
				libraryModel.get( 'library' ).off( null, null, frame );
				libraryModel.get( 'selection' ).off( null, null, frame );
				frame.off( null, null, frame );
				frame.remove();
			}

			frame
				.on( 'select', handleSelectButtonClick, frame )
				.on( 'cropped skippedcrop', handleSelectedImage, frame )
				.on( 'close', handleClose, frame );

			frame
				.state( 'library' )
				.get( 'selection' )
				.on(
					'selection:single selection:unsingle',
					handleSelectionToggle,
					frame
				);

			frame
				.state( 'library' )
				.get( 'library' )
				.once( 'attachments:received', handlePreselect, frame )
				.on( 'reset', handleSelectionToggle, frame ) // Triggered after uploading a new image
				.on( 'destroy', handleImageDeleted, frame ); // Triggered after deleting an image

			frame.open();
		},
		[
			minWidth,
			minHeight,
			suggestedWidth,
			suggestedHeight,
			ratioPercentError,
		]
	);

	return { openSelector };
}
