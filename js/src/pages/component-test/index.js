/**
 * External dependencies
 */
import { useState } from '@wordpress/element';
import { SelectControl } from '@woocommerce/components';

/**
 * Internal dependencies
 */
import SupportedCountrySelect from '.~/components/supported-country-select';
import TreeSelectControl from '.~/components/tree-select-control';
import './index.scss';

const ComponentTest = () => {
	const [ value, setValue ] = useState();

	/**
	 * For LocalSelectControl
	 */
	const [ selected, setSelected ] = useState( [ 'ES' ] );
	const [ disabled, setDisabled ] = useState( false );

	const treeSelectControlOptions = [
		{
			value: 'EU',
			label: 'Europe',
			children: [
				{ value: 'ES', label: 'Spain' },
				{ value: 'FR', label: 'France' },
				{ key: 'FR-Colonies', value: 'FR', label: 'France (Colonies)' },
			],
		},
		{
			value: 'AS',
			label: 'Asia',
			children: [
				{
					value: 'JP',
					label: 'Japan',
					children: [
						{
							value: 'TO',
							label: 'Tokio',
							children: [
								{ value: 'SI', label: 'Shibuya' },
								{ value: 'GI', label: 'Ginza' },
							],
						},
						{ value: 'OK', label: 'Okinawa' },
					],
				},
				{ value: 'CH', label: 'China' },
				{
					value: 'MY',
					label: 'Malaysia',
					children: [ { value: 'KU', label: 'Kuala Lumpur' } ],
				},
			],
		},
		{
			value: 'NA',
			label: 'North America',
			children: [
				{
					value: 'US',
					label: 'United States',
					children: [
						{ value: 'NY', label: 'New York' },
						{ value: 'TX', label: 'Texas' },
						{ value: 'GE', label: 'Georgia' },
						{ value: 'TX2', label: 'Tex 123' },
					],
				},
				{
					value: 'CA',
					label: 'Canada',
				},
			],
		},
		{
			value: 'XXX',
			label: 'KKK',
		},
		{
			value: '',
			label: 'Latex',
		},
	];

	return (
		<div>
			<button
				onClick={ () => {
					setDisabled( ! disabled );
				} }
			>
				Toggle Disable
			</button>
			<h2>TreeSelectControl</h2>
			<TreeSelectControl
				maxVisibleTags="5"
				disabled={ disabled }
				options={ treeSelectControlOptions }
				value={ selected }
				onChange={ setSelected }
				label="Select Country"
				selectAllLabel="All Countries"
				placeholder="Select"
			/>
			<hr />
			<hr />
			<h2>TreeSelectControl Custom style</h2>
			<TreeSelectControl
				className="gla-tree-select-control"
				disabled={ disabled }
				options={ treeSelectControlOptions }
				value={ selected }
				onChange={ setSelected }
				label="Select Country"
				selectAllLabel={ false }
				placeholder="Select"
			/>
			<hr />
			<hr />
			<h2>Existing SupportedCountrySelect:</h2>
			<SupportedCountrySelect
				multiple
				disabled={ disabled }
				value={ value }
				onChange={ setValue }
			/>
			<hr></hr>
			<h2>@woocommerce/components SelectControl with multiple:</h2>
			<SelectControl
				multiple
				disabled={ disabled }
				options={ [
					{ value: null, label: 'Select a User', disabled: true },
					{ value: 'a', label: 'User A' },
					{ value: 'b', label: 'User B' },
					{ value: 'c', label: 'User c' },
				] }
			/>
		</div>
	);
};

export default ComponentTest;
