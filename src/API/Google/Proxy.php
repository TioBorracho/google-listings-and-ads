<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\API\Google;

use Automattic\WooCommerce\GoogleListingsAndAds\Options\Options;
use Automattic\WooCommerce\GoogleListingsAndAds\Options\OptionsInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Value\TosAccepted;
use Exception;
use Google_Service_ShoppingContent as ShoppingContent;
use Google\Ads\GoogleAds\Lib\V6\GoogleAdsClient;
use GuzzleHttp\Client;
use Psr\Container\ContainerInterface;
use Psr\Http\Client\ClientExceptionInterface;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Class Proxy
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\API\Google
 */
class Proxy {

	/**
	 * @var ContainerInterface
	 */
	protected $container;

	/**
	 * Proxy constructor.
	 *
	 * @param ContainerInterface $container
	 */
	public function __construct( ContainerInterface $container ) {
		$this->container = $container;
	}

	/**
	 * Get merchant IDs associated with the connected Merchant Center account.
	 *
	 * @return int[]
	 */
	public function get_merchant_ids(): array {
		$ids = [];
		try {
			/** @var ShoppingContent $service */
			$service  = $this->container->get( ShoppingContent::class );
			$accounts = $service->accounts->authinfo();

			foreach ( $accounts->getAccountIdentifiers() as $account ) {

				$id = $account->getMerchantID();

				// $id can be NULL if it is a Multi Client Account (MCA)
				if ( $id ) {
					$ids[] = $id;
				}
			}

			return $ids;
		} catch ( Exception $e ) {
			return $ids;
		}
	}

	/**
	 * Get Ads IDs associated with the connected Google account.
	 *
	 * @return int[]
	 */
	public function get_ads_account_ids(): array {
		$ids = [];
		try {
			/** @var GoogleAdsClient $client */
			$client    = $this->container->get( GoogleAdsClient::class );
			$args      = [ 'headers' => $this->container->get( 'headers' ) ];
			$customers = $client->getCustomerServiceClient()->listAccessibleCustomers( $args );

			foreach ( $customers->getResourceNames() as $name ) {
				$ids[] = absint( str_replace( 'customers/', '', $name ) );
			}

			return $ids;
		} catch ( Exception $e ) {
			return $ids;
		}
	}

	/**
	 * Create a new Google Ads account.
	 *
	 * @param array $params Request paramaters.
	 *
	 * @return WP_REST_Response
	 */
	public function create_ads_account( array $params ): WP_REST_Response {
		try {
			/** @var Client $client */
			$client = $this->container->get( Client::class );
			$result = $client->post(
				$this->get_ads_manager_url( 'US/create-customer' ),
				[
					'body' => json_encode( $params ),
				]
			);

			$response = json_decode( $result->getBody()->getContents(), true );

			if ( 200 === $result->getStatusCode() && isset( $response['resourceName'] ) ) {
				return new WP_REST_Response( $this->update_ads_id( $response['resourceName'] ) );
			}

			return new WP_REST_Response( $response, $result->getStatusCode() );
		} catch ( Exception $e ) {
			do_action( 'gla_guzzle_client_exception', $e, __METHOD__ );

			return new WP_REST_Response( $e->getMessage(), 400 );
		}
	}

	/**
	 * Link an existing Google Ads account.
	 *
	 * @param int $id Existing account ID.
	 *
	 * @return WP_REST_Response
	 */
	public function link_ads_account( int $id ): WP_REST_Response {
		try {
			/** @var Client $client */
			$client = $this->container->get( Client::class );
			$result = $client->post(
				$this->get_ads_manager_url( 'link-customer' ),
				[
					'body' => json_encode(
						[
							'client_customer' => $id,
						]
					),
				]
			);

			$response = json_decode( $result->getBody()->getContents(), true );
			$name     = "customers/{$id}";

			if ( 200 === $result->getStatusCode() && isset( $response['resourceName'] ) && 0 === strpos( $response['resourceName'], $name ) ) {
				return new WP_REST_Response( $this->update_ads_id( $name ) );
			}

			return new WP_REST_Response( $response, $result->getStatusCode() );
		} catch ( Exception $e ) {
			do_action( 'gla_guzzle_client_exception', $e, __METHOD__ );

			return new WP_REST_Response( $e->getMessage(), 400 );
		}
	}

	/**
	 * Determine whether the TOS have been accepted.
	 *
	 * @return TosAccepted
	 */
	public function check_tos_accepted(): TosAccepted {
		// todo: see about using the WooCommerce Services code here
		try {
			/** @var Client $client */
			$client = $this->container->get( Client::class );
			$result = $client->get( $this->get_tos_url() );

			return new TosAccepted( 200 === $result->getStatusCode(), $result->getBody()->getContents() );
		} catch ( ClientExceptionInterface $e ) {
			do_action( 'gla_guzzle_client_exception', $e, __METHOD__ );

			return new TosAccepted( false, $e->getMessage() );
		}
	}

	/**
	 * Record TOS acceptance for a particular email address.
	 *
	 * @param string $email
	 *
	 * @return TosAccepted
	 */
	public function mark_tos_accepted( string $email ): TosAccepted {
		// todo: see about using WooCommerce Services code here.
		try {
			/** @var Client $client */
			$client = $this->container->get( Client::class );
			$result = $client->post(
				$this->get_tos_url(),
				[
					'body' => json_encode(
						[
							'email' => $email,
						]
					),
				]
			);

			return new TosAccepted(
				200 === $result->getStatusCode(),
				$result->getBody()->getContents() ?? $result->getReasonPhrase()
			);
		} catch ( ClientExceptionInterface $e ) {
			do_action( 'gla_guzzle_client_exception', $e, __METHOD__ );

			return new TosAccepted( false, $e->getMessage() );
		}
	}

	/**
	 * Get the TOS endpoint URL
	 *
	 * @return string
	 */
	protected function get_tos_url(): string {
		return $this->container->get( 'connect_server_root' ) . 'tos/google-mc';
	}

	/**
	 * Get the ads manager endpoint URL
	 *
	 * @param string $name Resource name.
	 *
	 * @return string
	 */
	protected function get_ads_manager_url( string $name = '' ): string {
		$url = $this->container->get( 'connect_server_root' ) . 'manager';
		return $name ? trailingslashit( $url ) . $name : $url;
	}

	/**
	 * Update the Ads ID to use for requests.
	 *
	 * @param string $name Resource name containing ID number.
	 *
	 * @return int
	 */
	protected function update_ads_id( string $name ): int {
		$id = absint( str_replace( 'customers/', '', $name ) );

		/** @var Options $options */
		$options = $this->container->get( OptionsInterface::class );
		$options->update( Options::ADS_ID, $id );
		return $id;
	}
}
