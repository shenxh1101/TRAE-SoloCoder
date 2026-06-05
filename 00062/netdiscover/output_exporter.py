import json
from datetime import datetime


DEVICE_TYPE_COLORS = {
    'router': '#e74c3c',
    'switch': '#3498db',
    'firewall': '#9b59b6',
    'printer': '#f39c12',
    'server': '#2ecc71',
    'wireless': '#1abc9c',
    'voip': '#e67e22',
    'storage': '#34495e',
    'load_balancer': '#16a085',
    'camera': '#c0392b',
    'iot': '#d35400',
    'other': '#7f8c8d',
    'host': '#95a5a6',
    'default': '#7f8c8d'
}

DEVICE_TYPE_SHAPES = {
    'router': 'ellipse',
    'switch': 'box',
    'firewall': 'diamond',
    'printer': 'pentagon',
    'server': 'oval',
    'wireless': 'circle',
    'voip': 'octagon',
    'storage': 'box',
    'load_balancer': 'parallelogram',
    'camera': 'circle',
    'iot': 'point',
    'other': 'circle',
    'host': 'circle',
    'default': 'circle'
}


class OutputExporter:
    def __init__(self, topology):
        self.topology = topology
        self.devices = topology.get('devices', {})
        self.connections = topology.get('connections', [])

    def export_json(self, output_path):
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.topology, f, indent=2, ensure_ascii=False)
        print(f"Topology exported to JSON: {output_path}")
        return True

    def export_dot(self, output_path):
        lines = [
            'digraph NetworkTopology {',
            '    rankdir=LR;',
            '    node [fontname="Arial", fontsize=10];',
            '    edge [fontname="Arial", fontsize=8];',
            ''
        ]

        for ip, device in self.devices.items():
            node_id = self._sanitize_node_id(ip)
            label = self._get_node_label(device)
            color = DEVICE_TYPE_COLORS.get(device.get('device_type', 'host'), DEVICE_TYPE_COLORS['default'])
            shape = DEVICE_TYPE_SHAPES.get(device.get('device_type', 'host'), DEVICE_TYPE_SHAPES['default'])
            style = 'filled' if device.get('snmp_available') else 'dashed'

            lines.append(
                f'    {node_id} [label="{label}", shape={shape}, style={style}, '
                f'fillcolor="{color}", fontcolor="white", color="{color}"];'
            )

        lines.append('')

        for conn in self.connections:
            source = self._sanitize_node_id(conn['source'])
            target = self._sanitize_node_id(conn['target'])
            conn_type = conn.get('type', 'arp')
            confidence = conn.get('confidence', 'medium')

            if conn_type == 'lldp' or conn_type == 'cdp':
                style = 'solid'
                color = '#2c3e50'
            else:
                style = 'dashed'
                color = '#95a5a6'

            label = conn_type.upper()
            if confidence == 'high':
                penwidth = '2'
            else:
                penwidth = '1'

            lines.append(
                f'    {source} -> {target} [label="{label}", style={style}, '
                f'color="{color}", penwidth={penwidth}];'
            )

        lines.append('}')

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        print(f"Topology exported to DOT: {output_path}")
        return True

    def _sanitize_node_id(self, ip):
        return 'n_' + ip.replace('.', '_').replace(':', '_')

    def _get_node_label(self, device):
        ip = device.get('ip', '')
        sys_name = device.get('sys_name', '')
        device_type = device.get('device_type', 'host')

        if sys_name:
            return f'{sys_name}\\n{ip}\\n({device_type})'
        else:
            return f'{ip}\\n({device_type})'

    def export_html(self, output_path):
        html_content = self._generate_html()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Topology exported to HTML: {output_path}")
        return True

    def _generate_html(self):
        nodes = []
        for ip, device in self.devices.items():
            nodes.append({
                'id': self._sanitize_node_id(ip),
                'ip': ip,
                'name': device.get('sys_name', ip),
                'type': device.get('device_type', 'host'),
                'color': DEVICE_TYPE_COLORS.get(device.get('device_type', 'host'), DEVICE_TYPE_COLORS['default']),
                'snmp_available': device.get('snmp_available', False)
            })

        links = []
        for conn in self.connections:
            links.append({
                'source': self._sanitize_node_id(conn['source']),
                'target': self._sanitize_node_id(conn['target']),
                'type': conn.get('type', 'arp'),
                'confidence': conn.get('confidence', 'medium')
            })

        legend_items = []
        for device_type, color in DEVICE_TYPE_COLORS.items():
            if device_type == 'default':
                continue
            legend_items.append(f'<div class="legend-item"><div class="legend-color" style="background-color: {color};"></div><span>{device_type.capitalize()}</span></div>')

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Topology Discovery</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
        }}
        .header p {{
            margin: 5px 0 0 0;
            opacity: 0.8;
        }}
        .container {{
            display: flex;
            height: calc(100vh - 100px);
        }}
        .sidebar {{
            width: 300px;
            background: white;
            padding: 20px;
            box-shadow: 2px 0 10px rgba(0,0,0,0.05);
            overflow-y: auto;
        }}
        .main {{
            flex: 1;
            position: relative;
        }}
        #topology {{
            width: 100%;
            height: 100%;
        }}
        #topologyCanvas {{
            width: 100%;
            height: 100%;
            display: none;
        }}
        .legend {{
            margin-top: 20px;
        }}
        .legend h3 {{
            margin-top: 0;
            color: #2c3e50;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            margin: 8px 0;
        }}
        .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }}
        .stats {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .stat-item {{
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }}
        .tooltip {{
            position: absolute;
            background: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
        }}
        .device-info {{
            margin-top: 20px;
        }}
        .device-info h3 {{
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
        }}
        .info-item {{
            margin: 8px 0;
            font-size: 14px;
        }}
        .info-label {{
            font-weight: bold;
            color: #7f8c8d;
        }}
        .node circle {{
            stroke: #fff;
            stroke-width: 2px;
            cursor: pointer;
        }}
        .node text {{
            font-size: 12px;
            pointer-events: none;
        }}
        .link {{
            stroke-opacity: 0.6;
        }}
        .link.high {{
            stroke: #2c3e50;
        }}
        .link.medium {{
            stroke: #95a5a6;
            stroke-dasharray: 5,5;
        }}
        .offline-notice {{
            position: absolute;
            top: 10px;
            right: 10px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #856404;
            z-index: 100;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🖧 Network Topology Discovery</h1>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Devices: {len(self.devices)} | Connections: {len(self.connections)}</p>
    </div>
    <div class="container">
        <div class="sidebar">
            <div class="stats">
                <div class="stat-item">
                    <span>Total Devices:</span>
                    <span><strong>{len(self.devices)}</strong></span>
                </div>
                <div class="stat-item">
                    <span>SNMP Enabled:</span>
                    <span><strong>{sum(1 for d in self.devices.values() if d.get('snmp_available'))}</strong></span>
                </div>
                <div class="stat-item">
                    <span>Connections:</span>
                    <span><strong>{len(self.connections)}</strong></span>
                </div>
            </div>
            <div class="legend">
                <h3>Device Types</h3>
                {''.join(legend_items)}
            </div>
            <div id="deviceInfo" class="device-info">
                <h3>Device Info</h3>
                <p style="color: #95a5a6;">Click on a node to see details</p>
            </div>
        </div>
        <div class="main">
            <div id="offlineNotice" class="offline-notice" style="display:none;">
                ⚠️ Offline mode - Using simplified canvas renderer
            </div>
            <svg id="topology"></svg>
            <canvas id="topologyCanvas"></canvas>
        </div>
    </div>
    <div class="tooltip" id="tooltip"></div>

    <script>
        window.nodesData = {json.dumps(nodes)};
        window.linksData = {json.dumps(links)};
        window.devicesData = {json.dumps(self.devices)};
    </script>

    <script src="https://d3js.org/d3.v7.min.js"></script>

    <script>
        function showDeviceInfoD3(d) {{
            const deviceInfo = document.getElementById("deviceInfo");
            const device = nodesData.find(n => n.id === d.id);
            const deviceData = devicesData[device.ip];
            
            let neighbors = [];
            linksData.forEach(l => {{
                if (l.source === d.id) neighbors.push(l.target);
                if (l.target === d.id) neighbors.push(l.source);
            }});
            const neighborDevices = nodesData.filter(n => neighbors.includes(n.id));
            
            deviceInfo.innerHTML = `
                <h3>${{device.name}}</h3>
                <div class="info-item">
                    <span class="info-label">IP Address:</span> ${{device.ip}}
                </div>
                <div class="info-item">
                    <span class="info-label">Type:</span> ${{device.type}}
                </div>
                <div class="info-item">
                    <span class="info-label">SNMP:</span> ${{device.snmp_available ? '✅ Yes' : '❌ No'}}
                </div>
                <div class="info-item">
                    <span class="info-label">Neighbors:</span> ${{neighborDevices.length}}
                </div>
                ${{deviceData && deviceData.sys_descr ? `
                <div class="info-item">
                    <span class="info-label">Description:</span>
                    <div style="font-size: 12px; margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                        ${{deviceData.sys_descr}}
                    </div>
                </div>
                ` : ''}}
                ${{neighborDevices.length > 0 ? `
                <div class="info-item">
                    <span class="info-label">Connected to:</span>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        ${{neighborDevices.map(n => `<li>${{n.name}} (${{n.ip}})</li>`).join('')}}
                    </ul>
                </div>
                ` : ''}}
            `;
        }}

        if (typeof d3 !== 'undefined') {{
            const nodes = nodesData;
            const links = linksData;

            const svg = d3.select("#topology");
            const width = svg.node().getBoundingClientRect().width || 800;
            const height = svg.node().getBoundingClientRect().height || 600;

            const g = svg.append("g");
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on("zoom", (event) => {{
                    g.attr("transform", event.transform);
                }});
            svg.call(zoom);

            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(150))
                .force("charge", d3.forceManyBody().strength(-400))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(50));

            const link = g.append("g")
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("class", d => "link " + d.confidence)
                .attr("stroke-width", d => d.confidence === "high" ? 3 : 1);

            const node = g.append("g")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            node.append("circle")
                .attr("r", d => d.snmp_available ? 25 : 18)
                .attr("fill", d => d.color)
                .on("click", (event, d) => showDeviceInfoD3(d));

            node.append("text")
                .text(d => d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name)
                .attr("text-anchor", "middle")
                .attr("dy", 40)
                .attr("font-size", "11px");

            simulation.on("tick", () => {{
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
            }});

            function dragstarted(event, d) {{
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }}

            function dragged(event, d) {{
                d.fx = event.x;
                d.fy = event.y;
            }}

            function dragended(event, d) {{
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }}
        }} else {{
            document.getElementById("offlineNotice").style.display = "block";
            document.getElementById("topology").style.display = "none";
            
            const canvas = document.getElementById("topologyCanvas");
            canvas.style.display = "block";
            const ctx = canvas.getContext("2d");
            
            function resizeCanvas() {{
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }}
            resizeCanvas();
            window.addEventListener("resize", resizeCanvas);

            const nodes = nodesData;
            const links = linksData;
            
            const nodePositions = {{}};
            const nodeCount = nodes.length;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) * 0.6;
            
            nodes.forEach((node, i) => {{
                const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
                nodePositions[node.id] = {{
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                    node: node
                }};
            }});

            function draw() {{
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                links.forEach(link => {{
                    const source = nodePositions[link.source];
                    const target = nodePositions[link.target];
                    if (source && target) {{
                        ctx.beginPath();
                        ctx.moveTo(source.x, source.y);
                        ctx.lineTo(target.x, target.y);
                        ctx.strokeStyle = link.confidence === "high" ? "#2c3e50" : "#95a5a6";
                        ctx.lineWidth = link.confidence === "high" ? 3 : 1;
                        if (link.confidence === "medium") {{
                            ctx.setLineDash([5, 5]);
                        }} else {{
                            ctx.setLineDash([]);
                        }}
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }}
                }});
                
                nodes.forEach(node => {{
                    const pos = nodePositions[node.id];
                    const nodeRadius = node.snmp_available ? 25 : 18;
                    
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = node.color;
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.fillStyle = "black";
                    ctx.font = "11px Arial";
                    ctx.textAlign = "center";
                    const displayName = node.name.length > 12 ? node.name.substring(0, 12) + "..." : node.name;
                    ctx.fillText(displayName, pos.x, pos.y + nodeRadius + 15);
                }});
            }}
            
            draw();
            
            canvas.addEventListener("click", (e) => {{
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                for (const id in nodePositions) {{
                    const pos = nodePositions[id];
                    const nodeRadius = pos.node.snmp_available ? 25 : 18;
                    const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
                    
                    if (distance <= nodeRadius) {{
                        const deviceInfo = document.getElementById("deviceInfo");
                        const deviceData = devicesData[pos.node.ip];
                        
                        let neighbors = [];
                        links.forEach(l => {{
                            if (l.source === id) neighbors.push(l.target);
                            if (l.target === id) neighbors.push(l.source);
                        }});
                        const neighborDevices = nodes.filter(n => neighbors.includes(n.id));
                        
                        deviceInfo.innerHTML = `
                            <h3>${{pos.node.name}}</h3>
                            <div class="info-item">
                                <span class="info-label">IP Address:</span> ${{pos.node.ip}}
                            </div>
                            <div class="info-item">
                                <span class="info-label">Type:</span> ${{pos.node.type}}
                            </div>
                            <div class="info-item">
                                <span class="info-label">SNMP:</span> ${{pos.node.snmp_available ? '✅ Yes' : '❌ No'}}
                            </div>
                            <div class="info-item">
                                <span class="info-label">Neighbors:</span> ${{neighborDevices.length}}
                            </div>
                            ${{deviceData && deviceData.sys_descr ? `
                            <div class="info-item">
                                <span class="info-label">Description:</span>
                                <div style="font-size: 12px; margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                                    ${{deviceData.sys_descr}}
                                </div>
                            </div>
                            ` : ''}}
                            ${{neighborDevices.length > 0 ? `
                            <div class="info-item">
                                <span class="info-label">Connected to:</span>
                                <ul style="margin: 5px 0; padding-left: 20px;">
                                    ${{neighborDevices.map(n => `<li>${{n.name}} (${{n.ip}})</li>`).join('')}}
                                </ul>
                            </div>
                            ` : ''}}
                        `;
                        break;
                    }}
                }}
            }});
        }}
    </script>
</body>
</html>'''
        return html

    def generate_report(self, output_path):
        lines = [
            '=' * 80,
            'NETWORK TOPOLOGY DISCOVERY REPORT',
            '=' * 80,
            f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
            f'Total Devices: {len(self.devices)}',
            f'Total Connections: {len(self.connections)}',
            ''
        ]

        lines.extend([
            '-' * 80,
            'DEVICE SUMMARY',
            '-' * 80,
            ''
        ])

        type_stats = {}
        for device in self.devices.values():
            dtype = device.get('device_type', 'host')
            type_stats[dtype] = type_stats.get(dtype, 0) + 1

        for dtype, count in sorted(type_stats.items()):
            lines.append(f'  {dtype.upper():15} {count} devices')
        lines.append('')

        lines.extend([
            '-' * 80,
            'DEVICE DETAILS',
            '-' * 80,
            ''
        ])

        for ip, device in sorted(self.devices.items()):
            sys_name = device.get('sys_name', 'N/A')
            dtype = device.get('device_type', 'host')
            snmp = 'Yes' if device.get('snmp_available') else 'No'
            
            lines.extend([
                f'Device: {ip}',
                f'  Name:         {sys_name}',
                f'  Type:         {dtype}',
                f'  SNMP:         {snmp}'
            ])

            neighbors = []
            for conn in self.connections:
                if conn['source'] == ip:
                    neighbors.append(conn['target'])
                elif conn['target'] == ip:
                    neighbors.append(conn['source'])

            if neighbors:
                lines.append(f'  Neighbors:    {len(neighbors)}')
                for neighbor in sorted(set(neighbors)):
                    neighbor_dev = self.devices.get(neighbor, {})
                    neighbor_name = neighbor_dev.get('sys_name', neighbor)
                    lines.append(f'    - {neighbor} ({neighbor_name})')
            else:
                lines.append(f'  Neighbors:    0')

            if device.get('interfaces'):
                lines.append(f'  Interfaces:   {len(device["interfaces"])}')
            
            if device.get('arp_table'):
                lines.append(f'  ARP Entries:  {len(device["arp_table"])}')
            
            if device.get('sys_descr'):
                descr = device['sys_descr'][:100] + '...' if len(device['sys_descr']) > 100 else device['sys_descr']
                lines.append(f'  Description:  {descr}')

            lines.append('')

        lines.extend([
            '-' * 80,
            'CONNECTION SUMMARY',
            '-' * 80,
            ''
        ])

        high_conf = sum(1 for c in self.connections if c.get('confidence') == 'high')
        med_conf = sum(1 for c in self.connections if c.get('confidence') == 'medium')
        lldp_count = sum(1 for c in self.connections if c.get('type') == 'lldp')
        cdp_count = sum(1 for c in self.connections if c.get('type') == 'cdp')
        arp_count = sum(1 for c in self.connections if c.get('type') == 'arp')

        lines.append(f'  High confidence: {high_conf}')
        lines.append(f'  Medium confidence: {med_conf}')
        lines.append(f'  LLDP: {lldp_count}')
        lines.append(f'  CDP: {cdp_count}')
        lines.append(f'  ARP inferred: {arp_count}')
        lines.append('')

        lines.extend([
            '-' * 80,
            'END OF REPORT',
            '-' * 80
        ])

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        print(f"Report generated: {output_path}")
        return True
