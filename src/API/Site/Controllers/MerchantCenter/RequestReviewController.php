<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\MerchantCenter;

use Automattic\WooCommerce\GoogleListingsAndAds\API\Google\Middleware;
use Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\BaseOptionsController;
use Automattic\WooCommerce\GoogleListingsAndAds\API\TransportMethods;
use Automattic\WooCommerce\GoogleListingsAndAds\Google\RequestReviewStatuses;
use Automattic\WooCommerce\GoogleListingsAndAds\Proxies\RESTServer;
use WP_REST_Request as Request;
use WP_REST_Response as Response;
use Exception;

defined( 'ABSPATH' ) || exit;

/**
 * Class IssuesController
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\MerchantCenter
 */
class RequestReviewController extends BaseOptionsController {


	/**
	 * RequestReviewController constructor.
	 *
	 * @param RESTServer            $server
	 * @param Middleware            $middleware
	 * @param RequestReviewStatuses $request_review_statuses
	 */
	public function __construct( RESTServer $server, Middleware $middleware, RequestReviewStatuses $request_review_statuses ) {
		parent::__construct( $server );
		$this->middleware              = $middleware;
		$this->request_review_statuses = $request_review_statuses;
	}

	/**
	 * Register rest routes with WordPress.
	 */
	public function register_routes(): void {
		/**
		 * GET information regarding the current Account Status
		 */
		$this->register_route(
			'mc/review',
			[
				[
					'methods'             => TransportMethods::READABLE,
					'callback'            => $this->get_review_read_callback(),
					'permission_callback' => $this->get_permission_callback(),
				],
				'schema' => $this->get_api_response_schema_callback(),
			],
		);

		/**
		 * POST a request review for the current account
		 */
		$this->register_route(
			'mc/request-review',
			[
				[
					'methods'             => TransportMethods::CREATABLE,
					'callback'            => $this->post_review_request_callback(),
					'permission_callback' => $this->get_permission_callback(),
				]
			],
		);
	}

	/**
	 * Get the callback function for returning the review status.
	 *
	 * @return callable
	 */
	protected function get_review_read_callback(): callable {
		return function ( Request $request ) {
			try {
				$response      = $this->middleware->get_account_review_status();
				$review_status = $this->request_review_statuses->get_statuses_from_response( $response );

				return $this->prepare_item_for_response( $review_status, $request );
			} catch ( Exception $e ) {
				return new Response( [ 'message' => $e->getMessage() ], $e->getCode() ?: 400 );
			}

		};
	}

	/**
	 * Get the callback function after requesting a review.
	 *
	 * @return Response
	 */
	protected function post_review_request_callback(): Response {
		try {

			// getting the current account status
			$account_review_status = $this->request_review_statuses->get_statuses_from_response( $this->middleware->get_account_review_status() );

			// Abort if it's in cool down period
			if ( $account_review_status['cooldown'] > 0 ) {
				do_action( 'woocommerce_gla_request_review_failure', [
					'error'                 => 'cooldown',
					'account_review_status' => $account_review_status
				] );
				throw new Exception( __( 'Your account is under cool down period and cannot request a new review.', 'google-listings-and-ads' ), 400 );
			}

			// Abort if there is no eligible region available
			if ( count( $account_review_status['reviewEligibleRegions'] ) === 0 ) {
				do_action( 'woocommerce_gla_request_review_failure', [
					'error'                 => 'ineligible',
					'account_review_status' => $account_review_status
				] );
				throw new Exception( __( 'Your account is not eligible for a new request review.', 'google-listings-and-ads' ), 400 );
			}

			$response = $this->middleware->account_request_review( $account_review_status['reviewEligibleRegions'] );

			return new Response( $response );
		} catch ( Exception $e ) {
			return new Response( [ 'message' => $e->getMessage() ], $e->getCode() ?: 400 );
		}
	}

	/**
	 * Get the item schema properties for the controller.
	 *
	 * @return array
	 */
	protected function get_schema_properties(): array {
		return [
			'status'   => [
				'type'        => 'string',
				'description' => __( 'The status of the last review.', 'google-listings-and-ads' ),
				'context'     => [ 'view' ],
				'readonly'    => true,
			],
			'cooldown' => [
				'type'        => 'integer',
				'description' => __( 'Timestamp indicating if the user is in cool down period.', 'google-listings-and-ads' ),
				'context'     => [ 'view' ],
				'readonly'    => true,
			],
			'issues'   => [
				'type'        => 'array',
				'description' => __( 'The issues related to the Merchant Center to be reviewed and addressed before approval.', 'google-listings-and-ads' ),
				'context'     => [ 'view' ],
				'readonly'    => true,
				'items'       => [
					'type' => 'string',
				],
			],
			'reviewEligibleRegions' => [
				'type'        => 'array',
				'description' => __( 'The region codes in which is allowed to request a new review.', 'google-listings-and-ads' ),
				'context'     => [ 'view' ],
				'readonly'    => true,
				'items'       => [
					'type' => 'string',
				],
			]
		];
	}


	/**
	 * Get the item schema name for the controller.
	 *
	 * Used for building the API response schema.
	 *
	 * @return string
	 */
	protected function get_schema_title(): string {
		return 'merchant_account_review';
	}
}
