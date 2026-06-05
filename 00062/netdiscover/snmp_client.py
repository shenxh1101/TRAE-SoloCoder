from pysnmp import hlapi
from .config import (
    DEFAULT_SNMP_COMMUNITIES,
    DEFAULT_SNMP_TIMEOUT,
    DEFAULT_SNMP_RETRIES,
    OID_SYS_DESCR,
    OID_SYS_NAME,
    OID_IF_DESCR,
    OID_IF_TYPE,
    OID_IF_MAC,
    OID_IF_OPER_STATUS,
    OID_ARP_IF_INDEX,
    OID_ARP_MAC,
    OID_ARP_NET_ADDR,
    OID_LLDP_REM_CHASSIS_ID,
    OID_LLDP_REM_PORT_ID,
    OID_LLDP_REM_SYS_NAME,
    OID_CDP_CACHE_DEVICE_ID,
    OID_CDP_CACHE_ADDR,
    OID_CDP_CACHE_PLATFORM,
    DEVICE_TYPE_KEYWORDS
)


class SNMPClient:
    def __init__(self, communities=None, timeout=DEFAULT_SNMP_TIMEOUT, retries=DEFAULT_SNMP_RETRIES):
        self.communities = communities if communities else DEFAULT_SNMP_COMMUNITIES
        self.timeout = timeout
        self.retries = retries
        self.active_community = None

    def _get(self, ip, oids):
        if not self.active_community:
            for community in self.communities:
                try:
                    result = self._get_with_community(ip, oids, community)
                    if result:
                        self.active_community = community
                        return result
                except Exception as e:
                    continue
            return None
        else:
            try:
                return self._get_with_community(ip, oids, self.active_community)
            except Exception:
                self.active_community = None
                return self._get(ip, oids)

    def _get_with_community(self, ip, oids, community):
        try:
            error_indication, error_status, error_index, var_binds = next(
                hlapi.getCmd(
                    hlapi.SnmpEngine(),
                    hlapi.CommunityData(community),
                    hlapi.UdpTransportTarget((ip, 161), timeout=self.timeout, retries=self.retries),
                    hlapi.ContextData(),
                    *[hlapi.ObjectType(hlapi.ObjectIdentity(oid)) for oid in oids]
                )
            )

            if error_indication or error_status:
                return None

            result = {}
            for var_bind in var_binds:
                oid = str(var_bind[0])
                value = var_bind[1]
                result[oid] = str(value)
            return result
        except Exception:
            return None

    def _walk(self, ip, base_oid):
        if not self.active_community:
            for community in self.communities:
                try:
                    result = self._walk_with_community(ip, base_oid, community)
                    if result:
                        self.active_community = community
                        return result
                except Exception:
                    continue
            return {}
        else:
            try:
                return self._walk_with_community(ip, base_oid, self.active_community)
            except Exception:
                self.active_community = None
                return self._walk(ip, base_oid)

    def _walk_with_community(self, ip, base_oid, community):
        result = {}
        try:
            for (error_indication, error_status, error_index, var_binds) in hlapi.nextCmd(
                hlapi.SnmpEngine(),
                hlapi.CommunityData(community),
                hlapi.UdpTransportTarget((ip, 161), timeout=self.timeout, retries=self.retries),
                hlapi.ContextData(),
                hlapi.ObjectType(hlapi.ObjectIdentity(base_oid)),
                lexicographicMode=False
            ):
                if error_indication or error_status:
                    break

                for var_bind in var_binds:
                    oid = str(var_bind[0])
                    value = str(var_bind[1])
                    result[oid] = value
        except Exception:
            pass
        return result

    def get_system_info(self, ip):
        oids = [OID_SYS_DESCR, OID_SYS_NAME]
        result = self._get(ip, oids)
        if not result:
            return None

        sys_descr = result.get(OID_SYS_DESCR, '')
        sys_name = result.get(OID_SYS_NAME, '')

        device_type = self._detect_device_type(sys_descr)

        return {
            'sys_descr': sys_descr,
            'sys_name': sys_name,
            'device_type': device_type
        }

    def _detect_device_type(self, sys_descr):
        sys_descr_lower = sys_descr.lower()
        
        for device_type, keywords in DEVICE_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in sys_descr_lower:
                    return device_type
        return 'host'

    def get_interfaces(self, ip):
        interfaces = {}

        descr = self._walk(ip, OID_IF_DESCR)
        types = self._walk(ip, OID_IF_TYPE)
        macs = self._walk(ip, OID_IF_MAC)
        status = self._walk(ip, OID_IF_OPER_STATUS)

        for oid, value in descr.items():
            idx = oid.split('.')[-1]
            interfaces[idx] = {
                'index': idx,
                'descr': value,
                'type': types.get(f'{OID_IF_TYPE}.{idx}', ''),
                'mac': self._format_mac(macs.get(f'{OID_IF_MAC}.{idx}', '')),
                'status': status.get(f'{OID_IF_OPER_STATUS}.{idx}', '')
            }

        return interfaces

    def _format_mac(self, mac_str):
        if not mac_str:
            return ''
        try:
            mac_bytes = mac_str.encode('latin-1') if isinstance(mac_str, str) else mac_str
            return ':'.join(f'{b:02x}' for b in mac_bytes).upper()
        except Exception:
            return mac_str

    def get_arp_table(self, ip):
        arp_table = []

        if_indexes = self._walk(ip, OID_ARP_IF_INDEX)
        macs = self._walk(ip, OID_ARP_MAC)
        ips = self._walk(ip, OID_ARP_NET_ADDR)

        for oid, if_idx in if_indexes.items():
            parts = oid.split('.')
            idx = '.'.join(parts[-4:])
            
            mac_oid = f'{OID_ARP_MAC}.{idx}'
            ip_oid = f'{OID_ARP_NET_ADDR}.{idx}'

            if mac_oid in macs and ip_oid in ips:
                arp_entry = {
                    'if_index': if_idx,
                    'mac': self._format_mac(macs[mac_oid]),
                    'ip': ips[ip_oid]
                }
                arp_table.append(arp_entry)

        return arp_table

    def get_lldp_neighbors(self, ip):
        neighbors = []

        chassis_ids = self._walk(ip, OID_LLDP_REM_CHASSIS_ID)
        port_ids = self._walk(ip, OID_LLDP_REM_PORT_ID)
        sys_names = self._walk(ip, OID_LLDP_REM_SYS_NAME)

        for oid, chassis_id in chassis_ids.items():
            parts = oid.split('.')
            time_mark = parts[-2]
            local_port = parts[-1]

            port_oid = f'{OID_LLDP_REM_PORT_ID}.{time_mark}.{local_port}'
            name_oid = f'{OID_LLDP_REM_SYS_NAME}.{time_mark}.{local_port}'

            neighbor = {
                'local_port': local_port,
                'chassis_id': self._format_mac(chassis_id),
                'port_id': port_ids.get(port_oid, ''),
                'sys_name': sys_names.get(name_oid, ''),
                'source': 'lldp'
            }
            neighbors.append(neighbor)

        return neighbors

    def get_cdp_neighbors(self, ip):
        neighbors = []

        device_ids = self._walk(ip, OID_CDP_CACHE_DEVICE_ID)
        addrs = self._walk(ip, OID_CDP_CACHE_ADDR)
        platforms = self._walk(ip, OID_CDP_CACHE_PLATFORM)

        for oid, device_id in device_ids.items():
            parts = oid.split('.')
            if_index = parts[-2]
            neighbor_idx = parts[-1]

            addr_oid = f'{OID_CDP_CACHE_ADDR}.{if_index}.{neighbor_idx}'
            platform_oid = f'{OID_CDP_CACHE_PLATFORM}.{if_index}.{neighbor_idx}'

            neighbor = {
                'local_port': if_index,
                'device_id': device_id,
                'address': addrs.get(addr_oid, ''),
                'platform': platforms.get(platform_oid, ''),
                'source': 'cdp'
            }
            neighbors.append(neighbor)

        return neighbors

    def get_all_neighbors(self, ip):
        lldp = self.get_lldp_neighbors(ip)
        cdp = self.get_cdp_neighbors(ip)
        return lldp + cdp
