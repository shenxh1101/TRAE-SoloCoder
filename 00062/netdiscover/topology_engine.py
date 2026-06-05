import csv
import ipaddress
from collections import defaultdict
from .icmp_scanner import ICMPScanner
from .snmp_client import SNMPClient
from .config import DEFAULT_MAX_DEPTH


class NetworkDevice:
    def __init__(self, ip):
        self.ip = ip
        self.sys_name = ''
        self.sys_descr = ''
        self.device_type = 'host'
        self.interfaces = {}
        self.arp_table = []
        self.neighbors = []
        self.discovered = False
        self.snmp_available = False
        self.depth = 0

    def to_dict(self):
        return {
            'ip': self.ip,
            'sys_name': self.sys_name,
            'sys_descr': self.sys_descr,
            'device_type': self.device_type,
            'interfaces': self.interfaces,
            'arp_table': self.arp_table,
            'neighbors': self.neighbors,
            'discovered': self.discovered,
            'snmp_available': self.snmp_available,
            'depth': self.depth
        }


class TopologyEngine:
    def __init__(self, snmp_communities=None, max_depth=DEFAULT_MAX_DEPTH, ping_threads=50):
        self.devices = {}
        self.connections = []
        self.max_depth = max_depth
        self.icmp_scanner = ICMPScanner(max_threads=ping_threads)
        self.snmp_client = SNMPClient(communities=snmp_communities)
        self.mac_to_ip = {}
        self.ip_to_mac = {}
        self.visited_ips = set()

    def import_seed_file(self, csv_path):
        try:
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    ip = row.get('ip', '').strip()
                    if ip:
                        device = NetworkDevice(ip)
                        device.sys_name = row.get('sys_name', '')
                        device.device_type = row.get('device_type', 'host')
                        device.discovered = True
                        self.devices[ip] = device
            print(f"Imported {len(self.devices)} devices from seed file")
            return True
        except Exception as e:
            print(f"Error importing seed file: {e}")
            return False

    def discover(self, ip_ranges=None, seed_ips=None):
        all_ips = set()

        if seed_ips:
            for ip in seed_ips:
                all_ips.add(ip)
                if ip not in self.devices:
                    self.devices[ip] = NetworkDevice(ip)

        if ip_ranges:
            for ip_range in ip_ranges:
                print(f"Scanning IP range: {ip_range}")
                alive_hosts = self.icmp_scanner.scan_range(ip_range)
                print(f"Found {len(alive_hosts)} alive hosts")
                for ip in alive_hosts:
                    all_ips.add(ip)
                    if ip not in self.devices:
                        self.devices[ip] = NetworkDevice(ip)

        for depth in range(self.max_depth):
            print(f"\n=== Discovery round {depth + 1} (depth {depth}) ===")
            
            current_devices = [
                ip for ip, dev in self.devices.items()
                if dev.depth == depth and not dev.snmp_available
            ]

            if not current_devices:
                break

            new_ips = set()
            for ip in current_devices:
                self._scan_device(ip, depth, new_ips)

            if new_ips:
                print(f"Discovered {len(new_ips)} new IPs from neighbors")
                for ip in new_ips:
                    if ip not in self.devices:
                        self.devices[ip] = NetworkDevice(ip)
                        self.devices[ip].depth = depth + 1

            if not new_ips:
                break

        self._infer_connections()
        return self.devices

    def _scan_device(self, ip, depth, new_ips):
        if ip in self.visited_ips:
            return
        
        self.visited_ips.add(ip)
        print(f"Scanning device: {ip}")
        device = self.devices[ip]

        sys_info = self.snmp_client.get_system_info(ip)
        if sys_info:
            device.snmp_available = True
            device.sys_name = sys_info['sys_name']
            device.sys_descr = sys_info['sys_descr']
            device.device_type = sys_info['device_type']
            print(f"  - SNMP available: {device.sys_name} ({device.device_type})")

            device.interfaces = self.snmp_client.get_interfaces(ip)
            print(f"  - Found {len(device.interfaces)} interfaces")

            device.arp_table = self.snmp_client.get_arp_table(ip)
            print(f"  - Found {len(device.arp_table)} ARP entries")

            for arp_entry in device.arp_table:
                arp_ip = arp_entry['ip']
                arp_mac = arp_entry['mac']
                if arp_ip and self._is_valid_ip(arp_ip):
                    self.mac_to_ip[arp_mac] = arp_ip
                    self.ip_to_mac[arp_ip] = arp_mac

            neighbors = self.snmp_client.get_all_neighbors(ip)
            device.neighbors = neighbors
            print(f"  - Found {len(neighbors)} LLDP/CDP neighbors")

            for neighbor in neighbors:
                neighbor_ip = neighbor.get('address', '')
                if neighbor_ip and self._is_valid_ip(neighbor_ip):
                    new_ips.add(neighbor_ip)

            for arp_entry in device.arp_table:
                arp_ip = arp_entry['ip']
                if arp_ip and self._is_valid_ip(arp_ip):
                    new_ips.add(arp_ip)

        device.discovered = True

    def _is_valid_ip(self, ip):
        try:
            ipaddress.ip_address(ip)
            return not ipaddress.ip_address(ip).is_multicast
        except ValueError:
            return False

    def _infer_connections(self):
        self.connections = []
        connected_pairs = set()

        for ip, device in self.devices.items():
            if not device.snmp_available:
                continue

            for neighbor in device.neighbors:
                neighbor_ip = neighbor.get('address', '')
                if not neighbor_ip or neighbor_ip not in self.devices:
                    continue

                pair = tuple(sorted([ip, neighbor_ip]))
                if pair in connected_pairs:
                    continue

                connection = {
                    'source': ip,
                    'target': neighbor_ip,
                    'source_port': neighbor.get('local_port', ''),
                    'target_port': neighbor.get('port_id', neighbor.get('device_id', '')),
                    'type': neighbor.get('source', 'lldp'),
                    'confidence': 'high'
                }
                self.connections.append(connection)
                connected_pairs.add(pair)

        arp_connections = defaultdict(list)
        for ip, device in self.devices.items():
            if not device.snmp_available:
                continue

            for arp_entry in device.arp_table:
                arp_ip = arp_entry['ip']
                if arp_ip in self.devices and arp_ip != ip:
                    pair = tuple(sorted([ip, arp_ip]))
                    arp_connections[pair].append({
                        'if_index': arp_entry.get('if_index', ''),
                        'mac': arp_entry.get('mac', '')
                    })

        for pair, entries in arp_connections.items():
            if pair in connected_pairs:
                continue

            source, target = pair
            connection = {
                'source': source,
                'target': target,
                'source_port': entries[0].get('if_index', ''),
                'target_port': '',
                'type': 'arp',
                'confidence': 'medium'
            }
            self.connections.append(connection)
            connected_pairs.add(pair)

        print(f"\nInferred {len(self.connections)} connections")

    def get_topology(self):
        return {
            'devices': {ip: dev.to_dict() for ip, dev in self.devices.items()},
            'connections': self.connections
        }
