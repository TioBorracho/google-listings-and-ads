<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\API\Google;

use Automattic\WooCommerce\GoogleListingsAndAds\API\Google\Query\AdsCampaignReportQuery;
use Automattic\WooCommerce\GoogleListingsAndAds\API\Google\Query\MerchantFreeListingReportQuery;
use Automattic\WooCommerce\GoogleListingsAndAds\Google\Ads\GoogleAdsClient;
use Automattic\WooCommerce\GoogleListingsAndAds\Options\OptionsAwareInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Options\OptionsAwareTrait;
use Automattic\WooCommerce\GoogleListingsAndAds\Proxies\WP;
use DateTime;
use Exception;
use Google\Ads\GoogleAds\V8\Services\GoogleAdsRow;
use Google\ApiCore\PagedListResponse;
use Google\Service\ShoppingContent;
use Google\Service\ShoppingContent\SearchResponse;

/**
 * Class MerchantMetrics
 *
 * @since   x.x.x
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\API\Google
 */
class MerchantMetrics implements OptionsAwareInterface {

	use OptionsAwareTrait;

	/**
	 * The Google shopping client.
	 *
	 * @var ShoppingContent
	 */
	protected $shopping_client;

	/**
	 * The Google ads client.
	 *
	 * @var GoogleAdsClient
	 */
	protected $ads_client;

	/**
	 * @var WP
	 */
	protected $wp;

	protected const MAX_QUERY_START_DATE = '2020-01-01';

	/**
	 * MerchantMetrics constructor.
	 *
	 * @param ShoppingContent $shopping_client
	 * @param GoogleAdsClient $ads_client
	 * @param WP              $wp
	 */
	public function __construct( ShoppingContent $shopping_client, GoogleAdsClient $ads_client, WP $wp ) {
		$this->shopping_client = $shopping_client;
		$this->ads_client      = $ads_client;
		$this->wp              = $wp;
	}

	/**
	 * Get number of free listing clicks.
	 *
	 * @return int
	 *
	 * @throws Exception When unable to get clicks data.
	 */
	public function get_free_listing_clicks(): int {
		if ( ! $this->options->get_merchant_id() ) {
			// Merchant account not set up
			return 0;
		}

		// Google API requires a date clause to be set but there doesn't seem to be any limits on how wide the range
		$query = ( new MerchantFreeListingReportQuery( [] ) )
			->set_client( $this->shopping_client, $this->options->get_merchant_id() )
			->where_date_between( self::MAX_QUERY_START_DATE, $this->get_tomorrow() )
			->fields( [ 'clicks' ] );

		/** @var SearchResponse $response */
		$response = $query->get_results();

		if ( empty( $response ) || empty( $response->getResults() ) ) {
			return 0;
		}

		$report_row = $response->getResults()[0];

		return (int) $report_row->getMetrics()->getClicks();
	}

	/**
	 * Get ads metrics across all campaigns.
	 *
	 * @return array Of metrics or empty if no metrics were available.
	 *
	 * @throws Exception When unable to get data.
	 */
	public function get_ads_metrics(): array {
		if ( ! $this->options->get_ads_id() ) {
			// Ads account not set up
			return [];
		}

		// Google API requires a date clause to be set but there doesn't seem to be any limits on how wide the range
		$query = ( new AdsCampaignReportQuery( [] ) )
			->set_client( $this->ads_client, $this->options->get_ads_id() )
			->where_date_between( self::MAX_QUERY_START_DATE, $this->get_tomorrow() )
			->fields( [ 'clicks', 'conversions', 'impressions' ] );

		/** @var PagedListResponse $response */
		$response = $query->get_results();

		$page = $response->getPage();
		if ( $page ) {
			/** @var GoogleAdsRow $row */
			$row = $page->getIterator()->current();
			$metrics = $row->getMetrics();

			if ( $metrics ) {
				return [
					'clicks'      => $metrics->getClicks(),
					'conversions' => $metrics->getConversions(),
					'impressions' => $metrics->getImpressions(),
				];
			}
		}

		return [];
	}

	/**
	 * Get tomorrow's date to ensure we include any metrics from the current day.
	 *
	 * @return string
	 */
	protected function get_tomorrow(): string {
		return ( new DateTime( 'tomorrow', $this->wp->wp_timezone() ) )->format( 'Y-m-d' );
	}

}
