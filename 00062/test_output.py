#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '.')

mock_topology = {
    'devices': {
        '192.168.1.1': {
            'ip': '192.168.1.1',
            'sys_name': 'MainRouter',
            'sys_descr': 'Cisco IOS Software, 2801 Software (C2801-ADVENTERPRISEK9-M)',
            'device_type': 'router',
            'interfaces': {'1': {'descr': 'FastEthernet0/0'}, '2': {'descr': 'FastEthernet0/1'}},
            'arp_table': [{'ip': '192.168.1.2', 'mac': '00:11:22:33:44:55'}],
            'neighbors': [],
            'discovered': True,
            'snmp_available': True,
            'depth': 0
        },
        '192.168.1.2': {
            'ip': '192.168.1.2',
            'sys_name': 'CoreSwitch',
            'sys_descr': 'Cisco Catalyst 2960 Switch',
            'device_type': 'switch',
            'interfaces': {},
            'arp_table': [],
            'neighbors': [],
            'discovered': True,
            'snmp_available': True,
            'depth': 1
        },
        '192.168.1.3': {
            'ip': '192.168.1.3',
            'sys_name': 'Server01',
            'sys_descr': 'Linux server',
            'device_type': 'server',
            'interfaces': {},
            'arp_table': [],
            'neighbors': [],
            'discovered': True,
            'snmp_available': False,
            'depth': 1
        }
    },
    'connections': [
        {
            'source': '192.168.1.1',
            'target': '192.168.1.2',
            'source_port': '1',
            'target_port': 'Gi0/1',
            'type': 'lldp',
            'confidence': 'high'
        },
        {
            'source': '192.168.1.1',
            'target': '192.168.1.3',
            'source_port': '',
            'target_port': '',
            'type': 'arp',
            'confidence': 'medium'
        }
    ]
}

from netdiscover.output_exporter import OutputExporter

print("Testing OutputExporter...")
exporter = OutputExporter(mock_topology)

os.makedirs('test_output', exist_ok=True)

print("\n1. Exporting JSON...")
exporter.export_json('test_output/topology.json')

print("\n2. Exporting DOT...")
exporter.export_dot('test_output/topology.dot')

print("\n3. Exporting HTML...")
exporter.export_html('test_output/topology.html')

print("\n4. Generating report...")
exporter.generate_report('test_output/report.txt')

print("\n" + "="*50)
print("All tests passed! Check test_output/ directory")
print("="*50)
