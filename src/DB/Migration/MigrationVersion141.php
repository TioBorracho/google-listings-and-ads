<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\DB\Migration;

use Automattic\WooCommerce\GoogleListingsAndAds\DB\DBHelper;
use Automattic\WooCommerce\GoogleListingsAndAds\DB\Table\MerchantIssueTable;
use wpdb;

defined( 'ABSPATH' ) || exit;

/**
 * Class MigrationVersion1_4_1
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\DB\Migration
 *
 * @since x.x.x
 */
class MigrationVersion141 extends AbstractMigration {

	/**
	 * @var DBHelper
	 */
	protected $db_helper;

	/**
	 * @var MerchantIssueTable
	 */
	protected $mc_issues_table;

	/**
	 * MigrationVersion141 constructor.
	 *
	 * @param wpdb               $wpdb The wpdb object.
	 * @param DBHelper           $db_helper
	 * @param MerchantIssueTable $mc_issues_table
	 */
	public function __construct( wpdb $wpdb, DBHelper $db_helper, MerchantIssueTable $mc_issues_table ) {
		parent::__construct( $wpdb );
		$this->db_helper       = $db_helper;
		$this->mc_issues_table = $mc_issues_table;
	}


	/**
	 * Returns the version to apply this migration for.
	 *
	 * @return string A version number. For example: 1.4.1
	 */
	public function get_applicable_version(): string {
		return '1.4.1';
	}

	/**
	 * Apply the migrations.
	 *
	 * @return void
	 */
	public function apply(): void {
		if ( $this->mc_issues_table->exists() &&
			 $this->db_helper->index_exists( $this->mc_issues_table->get_name(), 'product_issue' )
		) {
			// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$this->wpdb->query( "ALTER TABLE `{$this->wpdb->_escape( $this->mc_issues_table->get_name() )}` DROP INDEX `product_issue`" );
			// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
		}
	}
}
