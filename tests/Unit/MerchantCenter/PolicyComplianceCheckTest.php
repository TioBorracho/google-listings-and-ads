<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\Tests\Unit\MerchantCenter;

use Automattic\WooCommerce\GoogleListingsAndAds\Proxies\WC;
use Automattic\WooCommerce\GoogleListingsAndAds\Google\GoogleHelper;
use Automattic\WooCommerce\GoogleListingsAndAds\MerchantCenter\TargetAudience;
use Automattic\WooCommerce\GoogleListingsAndAds\Tests\Framework\WPRequestUnitTest;
use Automattic\WooCommerce\GoogleListingsAndAds\MerchantCenter\PolicyComplianceCheck;
use PHPUnit\Framework\MockObject\MockObject;

use WC_Payment_Gateway;

defined( 'ABSPATH' ) || exit;

/**
 * Class PolicyComplianceCheckTest
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Tests\Unit\MerchantCenter
 */
class PolicyComplianceCheckTest extends WPRequestUnitTest {

	/** @var MockObject|GoogleHelper $google_helper */
	protected $google_helper;

	/** @var MockObject|TargetAudience $target_audience */
	protected $target_audience;

	/** @var PolicyComplianceCheck $policy_compliance_check */
	protected $policy_compliance_check;

	/** @var MockObject|WC $wc */
	protected $wc;

	/**
	 * Runs before each test is executed.
	 */
	public function setUp(): void {
		parent::setUp();
		$this->wc              = $this->createMock( WC::class );
		$this->google_helper   = $this->createMock( GoogleHelper::class );
		$this->target_audience = $this->createMock( TargetAudience::class );

		$this->policy_compliance_check = new PolicyComplianceCheck( $this->wc, $this->google_helper, $this->target_audience );
	}

	public function test_website_accessible() {
		$this->wc->expects( $this->any() )
			->method( 'get_allowed_countries' )
			->willReturn(
				[
					'AU' => 'Australia',
					'AT' => 'Austria',
					'CA' => 'Canada',
					'US' => 'United States',
				]
			);
		$this->target_audience->expects( $this->any() )
			->method( 'get_target_countries' )
			->willReturn( [ 'AU', 'US' ] );

		$this->assertTrue( $this->policy_compliance_check->is_accessible() );
	}

	public function test_website_not_accessible() {
		$this->wc->expects( $this->any() )
			->method( 'get_allowed_countries' )
			->willReturn(
				[
					'AU' => 'Australia',
					'AT' => 'Austria',
					'CA' => 'Canada',
					'US' => 'United States',
				]
			);
		$this->target_audience->expects( $this->any() )
			->method( 'get_target_countries' )
			->willReturn( [ 'FR', 'US' ] );

		$this->assertFalse( $this->policy_compliance_check->is_accessible() );
	}

	public function test_payment_gateways() {
		$this->wc->expects( $this->any() )
			->method( 'get_available_payment_gateways' )
			->willReturn(
				[
					'stripe' => $this->createMock( WC_Payment_Gateway::class ),
					'paypal' => $this->createMock( WC_Payment_Gateway::class ),
				]
			);

		$this->assertTrue( $this->policy_compliance_check->has_payment_gateways() );
	}

	public function test_empty_payment_gateways() {
		$this->wc->expects( $this->any() )
			->method( 'get_available_payment_gateways' )
			->willReturn( [] );

		$this->assertFalse( $this->policy_compliance_check->has_payment_gateways() );
	}

	public function test_not_has_page_not_found_error() {
		$this->mock_wp_request( 'http://example.org', '' );
		$this->assertFalse( $this->policy_compliance_check->has_page_not_found_error() );
	}

	public function test_has_page_not_found_error() {
		$this->mock_wp_request( 'http://example.org', '', 404 );
		$this->assertTrue( $this->policy_compliance_check->has_page_not_found_error() );
	}

	public function test_not_has_redirects() {
		$this->mock_wp_request( 'http://example.org', '' );
		$this->assertFalse( $this->policy_compliance_check->has_redirects() );
	}

	public function test_has_redirects() {
		$this->mock_wp_request( 'http://example.org', '', 301 );
		$this->assertTrue( $this->policy_compliance_check->has_redirects() );
	}

	public function test_not_has_restrictions() {
		$this->assertFalse( $this->policy_compliance_check->has_restriction() );
	}

	public function test_has_restrictions() {
		$this->mock_wp_request( 'http://example.org/robots.txt', "User-agent: *\nDisallow: /" );
		$this->assertTrue( $this->policy_compliance_check->has_restriction() );
	}

	public function test_without_store_ssl() {
		$this->assertFalse( $this->policy_compliance_check->get_is_store_ssl() );
	}

	public function test_with_store_ssl() {
		$override_url = function () {
			return 'https://secure.url';
		};
		add_filter( 'woocommerce_gla_site_url', $override_url );
		$this->assertTrue( $this->policy_compliance_check->get_is_store_ssl() );
		remove_filter( 'woocommerce_gla_site_url', $override_url );
	}

	public function test_not_has_refund_page() {
		$this->assertFalse( $this->policy_compliance_check->has_refund_return_policy_page() );
	}

	public function test_has_refund_page() {
		$page_id = wp_insert_post(
			[
				'post_title'  => 'Refund and Returns',
				'post_name'   => 'refund_returns',
				'post_type'   => 'page',
				'post_status' => 'publish',
			]
		);

		$this->assertTrue( $this->policy_compliance_check->has_refund_return_policy_page() );
		wp_delete_post( $page_id, true );
	}
}
