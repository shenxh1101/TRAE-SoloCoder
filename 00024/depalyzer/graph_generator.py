from __future__ import annotations

from typing import Any


class GraphGenerator:
    def __init__(self, analysis_result: dict[str, Any]):
        self.analysis_result = analysis_result

    def generate_text_graph(self) -> str:
        lines = []

        for pkg_manager, data in self.analysis_result.items():
            lines.append(f"=== {pkg_manager.upper()} 依赖图谱")
            lines.append("")

            direct_deps = data.get("direct_dependencies", [])
            transitive_deps = data.get("transitive_dependencies", [])

            if not direct_deps and not transitive_deps:
                lines.append("  无依赖")
                lines.append("")
                continue

            lines.append("  项目根节点")
            for i, dep in enumerate(direct_deps):
                is_last = i == len(direct_deps) - 1
                connector = "└── " if is_last else "├── "
                lines.append(f"  {connector}{dep['name']}@{dep.get('version', '')}")

                children = [
                    t for t in transitive_deps if t.get("parent") == dep["name"]
                ]
                for j, child in enumerate(children):
                    child_connector = "    └── " if (j == len(children) - 1 and is_last) else "    ├── "
                    lines.append(f"  {child_connector}{child['name']}@{child.get('version', '')}")

            lines.append("")

        return "\n".join(lines)

    def generate_dot(self) -> str:
        lines = [
            "digraph dependencies {",
            '  rankdir=LR;',
            '  node [shape=box, style=filled, fillcolor="#e8f4fd"];',
            '  edge [color="#666"];',
            "",
        ]

        node_id = 0
        node_map = {}

        for pkg_manager, data in self.analysis_result.items():
            root_id = f"{pkg_manager}_root"
            lines.append(f'  {root_id} [label="{pkg_manager.upper()}", shape=ellipse, fillcolor="#ffd700"];')

            direct_deps = data.get("direct_dependencies", [])
            transitive_deps = data.get("transitive_dependencies", [])

            for dep in direct_deps:
                dep_id = f'"{dep["name"]}"'
                if dep["name"] not in node_map:
                    node_map[dep["name"]] = dep_id
                    version = dep.get("version", "")
                    label = f'{dep["name"]}\\n{version}'
                    lines.append(f'  {dep_id} [label="{label}"];')
                lines.append(f'  {root_id} -> {dep_id};')

            for dep in transitive_deps:
                dep_id = f'"{dep["name"]}"'
                if dep["name"] not in node_map:
                    node_map[dep["name"]] = dep_id
                    version = dep.get("version", "")
                    label = f'{dep["name"]}\\n{version}'
                    lines.append(f'  {dep_id} [label="{label}", fillcolor="#f0f0f0"];')

                parent = dep.get("parent")
                if parent and parent in node_map:
                    lines.append(f'  {node_map[parent]} -> {dep_id};')

        lines.append("}")
        return "\n".join(lines)
