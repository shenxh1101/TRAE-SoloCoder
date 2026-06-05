import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_SNMP_COMMUNITIES = [
    'public',
    'private',
    'admin',
    'manager',
    'cisco',
    'read',
    'monitor'
]

DEFAULT_SNMP_TIMEOUT = 2
DEFAULT_SNMP_RETRIES = 1

DEFAULT_PING_TIMEOUT = 1
DEFAULT_PING_COUNT = 1
DEFAULT_PING_THREADS = 50

DEFAULT_MAX_DEPTH = 3

OID_SYS_DESCR = '1.3.6.1.2.1.1.1.0'
OID_SYS_NAME = '1.3.6.1.2.1.1.5.0'
OID_IF_NUMBER = '1.3.6.1.2.1.2.1.0'
OID_IF_TABLE = '1.3.6.1.2.1.2.2.1'
OID_IF_DESCR = '1.3.6.1.2.1.2.2.1.2'
OID_IF_TYPE = '1.3.6.1.2.1.2.2.1.3'
OID_IF_MAC = '1.3.6.1.2.1.2.2.1.6'
OID_IF_OPER_STATUS = '1.3.6.1.2.1.2.2.1.8'

OID_ARP_IP = '1.3.6.1.2.1.4.22.1'
OID_ARP_IF_INDEX = '1.3.6.1.2.1.4.22.1.1'
OID_ARP_MAC = '1.3.6.1.2.1.4.22.1.2'
OID_ARP_NET_ADDR = '1.3.6.1.2.1.4.22.1.3'

OID_LLDP_REM_TABLE = '1.0.8802.1.1.2.1.4.1'
OID_LLDP_REM_CHASSIS_ID = '1.0.8802.1.1.2.1.4.1.1.5'
OID_LLDP_REM_PORT_ID = '1.0.8802.1.1.2.1.4.1.1.7'
OID_LLDP_REM_SYS_NAME = '1.0.8802.1.1.2.1.4.1.1.9'

OID_CDP_CACHE_TABLE = '1.3.6.1.4.1.9.9.23.1.2.1.1'
OID_CDP_CACHE_DEVICE_ID = '1.3.6.1.4.1.9.9.23.1.2.1.1.6'
OID_CDP_CACHE_ADDR = '1.3.6.1.4.1.9.9.23.1.2.1.1.4'
OID_CDP_CACHE_PLATFORM = '1.3.6.1.4.1.9.9.23.1.2.1.1.8'

DEVICE_TYPE_KEYWORDS = {
    'router': [
        'router', 'cisco', 'juniper', 'huawei', 'ne40', 'ar22', 'srx',
        'mikrotik', 'routeros', 'arista', 'nokia', 'alcatel', 'ericsson',
        'ios', 'junos', 'vrp', 'ne5000e', 'ne20', 'ar12', 'ar32', 'h3c',
        'msr', 'cr', 'br', 'pe', 'isr', 'asr', '7200', '7600', '1841',
        '2811', '3825', '2901', '3925', '4321', '4331', '4351'
    ],
    'switch': [
        'switch', 'catalyst', 'nexus', '2960', '3560', '3750', 's5700', 's5735',
        's3700', 's5300', 's6700', 's7700', 's9700', 's12700', 'ce', 'ex', 'qfx',
        '3com', 'hp procurve', 'procurve', 'aruba', 'dell powerconnect', 'powerconnect',
        'force10', 'extreme', 'brocade', 'foundry', '2950', '3550', '4500', '6500',
        '3850', '3650', '9200', '9300', 'n3k', 'n5k', 'n7k', 'n9k', 'stackwise',
        'blade', 'fabric', '1g', '10g', '40g', '100g', 'poe', 'sfp', 'qsfp'
    ],
    'firewall': [
        'firewall', 'asa', 'paloalto', 'fortinet', 'srx', 'checkpoint',
        'fortigate', 'netscaler', 'pfsense', 'opnsense', 'sophos', 'watchguard',
        'barracuda', 'sonicwall', 'juniper srx', 'asa5500', 'asa5505', 'asa5510',
        'asa5520', 'asa5525', 'asa5545', 'asa5555', 'ftd', 'firepower', 'pan-os',
        'pa-220', 'pa-820', 'pa-850', 'pa-3220', 'pa-3250', 'pa-5220', 'ngfw',
        'utm', 'ids', 'ips', 'threat', 'security', 'vpn', 'ssl vpn', 'ipsec'
    ],
    'printer': [
        'printer', 'hp', 'xerox', 'canon', 'epson', 'brother', 'ricoh', 'kyocera',
        'sharp', 'konica', 'minolta', 'lexmark', 'oki', 'samsung', 'toshiba',
        'laserjet', 'deskjet', 'officejet', 'phaser', 'workcentre', 'imagerunner',
        'multifunction', 'mfp', 'print server', 'spooler', 'cups', 'ipp', 'lpr'
    ],
    'server': [
        'server', 'windows', 'linux', 'ubuntu', 'centos', 'debian', 'redhat', 'rhel',
        'suse', 'fedora', 'gentoo', 'arch', 'freebsd', 'netbsd', 'openbsd', 'solaris',
        'aix', 'hp-ux', 'esxi', 'vmware', 'hyper-v', 'kvm', 'xen', 'proxmox',
        'docker', 'kubernetes', 'k8s', 'container', 'virtual machine', 'vm', 'vsphere',
        'esx', 'vcsa', 'vcenter', 'proliant', 'poweredge', 'system x', 'bladecenter',
        'rack', 'datacenter', 'nas', 'san', 'storage', 'iscsi', 'nfs', 'smb', 'cifs'
    ],
    'wireless': [
        'wireless', 'wifi', 'wi-fi', 'wlan', 'access point', 'ap', 'capwap', 'lwapp',
        'wlc', 'controller', 'meraki', 'aruba', 'unifi', 'ubiquiti', 'mikrotik wap',
        '802.11', '802.11a', '802.11b', '802.11g', '802.11n', '802.11ac', '802.11ax',
        '2.4ghz', '5ghz', '6ghz', 'ssid', 'bssid', 'radio', 'antenna'
    ],
    'voip': [
        'voip', 'voice', 'phone', 'ip phone', 'cucm', 'callmanager', 'asterisk',
        'freepbx', '3cx', 'avaya', 'polycom', 'grandstream', 'yealink', 'snom',
        'sip', 'h.323', 'mgcp', 'sccp', 'skype', 'teams', 'pstn', 'isdn', 'pri',
        'gateway', 'ata', 'pbx', 'ippbx', 'call center', 'contact center'
    ],
    'storage': [
        'storage', 'san', 'nas', 'fibre channel', 'fc', 'iscsi', 'fcoe', 'nvme',
        'netapp', 'emc', 'dell emc', 'hitachi', 'ibm storage', 'hp storage',
        'synology', 'qnap', 'asustor', 'buffalo', 'thecus', 'drobo', 'unraid',
        'truenas', 'freenas', 'zfs', 'raid', 'jbod', 'sata', 'sas', 'ssd', 'hdd',
        'vmax', 'vnx', 'unity', 'powerstore', 'powermax', '3par', 'storeonce'
    ],
    'load_balancer': [
        'load balancer', 'loadbalancer', 'adc', 'application delivery',
        'f5', 'big-ip', 'netscaler', 'a10', 'thunder', 'barracuda', 'kemp',
        'citrix adc', 'nginx plus', 'haproxy', 'traefik', 'lvs', 'keepalived',
        'gtm', 'ltm', 'dns', 'global traffic', 'local traffic', 'vip', 'virtual ip'
    ],
    'camera': [
        'camera', 'ip camera', 'nvr', 'dvr', 'hikvision', 'dahua', 'axis',
        'bosch', 'pelco', 'hanwha', 'samsung techwin', 'onvif', 'rtsp',
        'surveillance', 'cctv', 'video encoder', 'video decoder', 'ptz',
        'lpr', 'anpr', 'video analytics', 'recorder', 'milestone', 'genetec'
    ],
    'iot': [
        'iot', 'internet of things', 'sensor', 'gateway', 'edge', 'mqtt',
        'coap', 'lorawan', 'nb-iot', 'modbus', 'bacnet', 'knx', 'zigbee',
        'z-wave', 'bluetooth', 'ble', 'smart meter', 'plc', 'scada', 'rtu',
        'industrial', 'automation', 'thermostat', 'smart home', 'connected'
    ],
    'host': [
        'pc', 'desktop', 'laptop', 'workstation', 'mac', 'macos', 'iphone',
        'ipad', 'android', 'mobile', 'tablet', 'notebook', 'chromebook',
        'surface', 'thinkpad', 'latitude', 'optiplex', 'precision', 'tower',
        'mini', 'nuc', 'raspberry', 'pi', 'arduino', 'esp32', 'esp8266'
    ],
    'other': [
        'ups', 'apc', 'eaton', 'pdu', 'rac', 'kvm', 'console server',
        'terminal server', 'power', 'uninterruptible', 'battery',
        'environmental', 'monitoring', 'snmp device', 'generic device'
    ]
}
