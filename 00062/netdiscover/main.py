#!/usr/bin/env python3
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netdiscover.topology_engine import TopologyEngine
from netdiscover.output_exporter import OutputExporter
from netdiscover.config import DEFAULT_SNMP_COMMUNITIES, DEFAULT_MAX_DEPTH


def main():
    parser = argparse.ArgumentParser(
        description='Network Topology Discovery Tool - Discover network devices using ICMP and SNMP',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s -r 192.168.1.0/24
  %(prog)s -r 10.0.0.0/8 --seed 10.0.0.1
  %(prog)s -s seed.csv -o output/
  %(prog)s -r 192.168.1.0/24 --communities public admin cisco
        '''
    )

    parser.add_argument('-r', '--range', nargs='+',
                        dest='ip_ranges',
                        help='IP ranges to scan (e.g., 192.168.1.0/24)')
    
    parser.add_argument('--seed', nargs='+',
                        dest='seed_ips',
                        help='Seed IP addresses to start discovery')
    
    parser.add_argument('-s', '--seed-file',
                        dest='seed_file',
                        help='CSV seed file with device list')
    
    parser.add_argument('-o', '--output-dir',
                        dest='output_dir',
                        default='.',
                        help='Output directory (default: current directory)')
    
    parser.add_argument('--communities', nargs='+',
                        dest='communities',
                        default=DEFAULT_SNMP_COMMUNITIES,
                        help=f'SNMP community strings (default: {", ".join(DEFAULT_SNMP_COMMUNITIES)})')
    
    parser.add_argument('--depth', type=int,
                        dest='max_depth',
                        default=DEFAULT_MAX_DEPTH,
                        help=f'Maximum discovery depth (default: {DEFAULT_MAX_DEPTH})')
    
    parser.add_argument('--threads', type=int,
                        dest='ping_threads',
                        default=50,
                        help='Number of ping threads (default: 50)')
    
    parser.add_argument('--no-json',
                        action='store_true',
                        help='Skip JSON output')
    
    parser.add_argument('--no-dot',
                        action='store_true',
                        help='Skip DOT output')
    
    parser.add_argument('--no-html',
                        action='store_true',
                        help='Skip HTML output')
    
    parser.add_argument('--no-report',
                        action='store_true',
                        help='Skip text report output')
    
    parser.add_argument('-v', '--version',
                        action='version',
                        version='Network Topology Discovery Tool 1.0.0')

    args = parser.parse_args()

    if not args.ip_ranges and not args.seed_ips and not args.seed_file:
        parser.print_help()
        print("\nError: At least one of --range, --seed, or --seed-file must be specified.")
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    print("=" * 60)
    print("Network Topology Discovery Tool")
    print("=" * 60)
    print()

    engine = TopologyEngine(
        snmp_communities=args.communities,
        max_depth=args.max_depth,
        ping_threads=args.ping_threads
    )

    if args.seed_file:
        print(f"Importing seed file: {args.seed_file}")
        engine.import_seed_file(args.seed_file)

    print("Starting network discovery...")
    print(f"  IP Ranges: {args.ip_ranges or 'N/A'}")
    print(f"  Seed IPs: {args.seed_ips or 'N/A'}")
    print(f"  Max Depth: {args.max_depth}")
    print(f"  SNMP Communities: {', '.join(args.communities)}")
    print()

    engine.discover(ip_ranges=args.ip_ranges, seed_ips=args.seed_ips)

    topology = engine.get_topology()

    print()
    print("=" * 60)
    print("Discovery Complete!")
    print("=" * 60)
    print(f"Total devices: {len(topology['devices'])}")
    print(f"Total connections: {len(topology['connections'])}")
    print()

    exporter = OutputExporter(topology)

    prefix = os.path.join(args.output_dir, 'network_topology')

    if not args.no_json:
        exporter.export_json(f'{prefix}.json')

    if not args.no_dot:
        exporter.export_dot(f'{prefix}.dot')

    if not args.no_html:
        exporter.export_html(f'{prefix}.html')

    if not args.no_report:
        exporter.generate_report(f'{prefix}_report.txt')

    print()
    print("=" * 60)
    print("Output files generated:")
    print("=" * 60)
    if not args.no_json:
        print(f"  - {prefix}.json")
    if not args.no_dot:
        print(f"  - {prefix}.dot")
    if not args.no_html:
        print(f"  - {prefix}.html")
    if not args.no_report:
        print(f"  - {prefix}_report.txt")
    print()


if __name__ == '__main__':
    main()
