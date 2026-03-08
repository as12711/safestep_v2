import os
import osmnx as ox

# =========================================================
# CONFIG
# =========================================================
LOCATION = "Manhattan, New York, USA"
OUTPUT_DIR = "."

NODES_OUT = os.path.join(OUTPUT_DIR, "nodes_osm.csv")
EDGES_OUT = os.path.join(OUTPUT_DIR, "edges_osm.csv")

print("\n========================================")
print("OSM PEDESTRIAN DATASET BUILDER")
print("========================================")
print(f"Location: {LOCATION}")
print("")


# =========================================================
# LOAD OSM WALK NETWORK
# =========================================================
print("Step 1: Loading walkable network from OpenStreetMap...")

G = ox.graph_from_place(
    LOCATION,
    network_type="walk",
    simplify=True
)

edges = ox.graph_to_gdfs(G, nodes=False)
nodes = ox.graph_to_gdfs(G, edges=False)

print(f"✓ Graph loaded")
print(f"  Nodes: {G.number_of_nodes():,}")
print(f"  Edges: {G.number_of_edges():,}")
print("")


# =========================================================
# DROP UNWANTED RAW COLUMNS
# =========================================================
print("Step 2: Removing unused raw OSM attributes...")

edges = edges.drop(columns=[
    "osmid",
    "oneway",
    "reversed",
    "lanes",
    "ref",
    "area",
    "landuse",
    "junction",
    "est_width",
    "width",
    "maxspeed",
    "name"
], errors="ignore")

nodes = nodes.drop(columns=[
    "ref",
    "railway"
], errors="ignore")

print("✓ Raw attribute cleanup complete")
print("")


# =========================================================
# NODE FEATURE ENGINEERING
# =========================================================
print("Step 3: Creating node-level infrastructure indicators...")

nodes["is_crossing"] = nodes["highway"].astype(str).str.contains("crossing", na=False)
nodes["is_signal"] = nodes["highway"].astype(str).str.contains("traffic_signals", na=False)
nodes["has_elevator"] = nodes["highway"].astype(str).str.contains("elevator", na=False)
nodes["has_steps"] = nodes["highway"].astype(str).str.contains("steps", na=False)

nodes = nodes.drop(columns=["highway"], errors="ignore")

print("✓ Node features created")
print(f"  Crossings: {nodes['is_crossing'].sum():,}")
print(f"  Signalized crossings: {nodes['is_signal'].sum():,}")
print(f"  Elevators: {nodes['has_elevator'].sum():,}")
print(f"  Stair nodes: {nodes['has_steps'].sum():,}")
print("")


# =========================================================
# EDGE FEATURE ENGINEERING
# =========================================================
print("Step 4: Creating edge-level infrastructure indicators...")

edges["is_sidewalk"] = edges["highway"].astype(str).str.contains("footway", na=False)
edges["is_path"] = edges["highway"].astype(str).str.contains("path", na=False)
edges["is_stairs"] = edges["highway"].astype(str).str.contains("steps", na=False)
edges["is_pedestrian"] = edges["highway"].astype(str).str.contains("pedestrian", na=False)
edges["is_residential_street"] = edges["highway"].astype(str).str.contains("residential", na=False)

edges["for_walking"] = (
    edges["is_sidewalk"] |
    edges["is_path"] |
    edges["is_pedestrian"]
)

edges = edges.drop(columns=["highway", "is_sidewalk", "is_path", "is_pedestrian"], errors="ignore")

print("✓ Walking infrastructure features created")
print(f"  Walking segments: {edges['for_walking'].sum():,}")
print(f"  Stair segments: {edges['is_stairs'].sum():,}")
print("")


# =========================================================
# STRUCTURE / ACCESS FEATURES
# =========================================================
print("Step 5: Encoding bridge, tunnel, and access features...")

edges["is_bridge"] = edges["bridge"].astype(str).str.contains(
    "yes|boardwalk|viaduct|pier|covered|movable",
    case=False,
    na=False
)

edges["is_tunnel"] = edges["tunnel"].astype(str).str.contains(
    "yes|passage|underground",
    case=False,
    na=False
)

edges["restricted_access"] = edges["access"].astype(str).str.contains(
    "no|customers|permit|residents|delivery",
    case=False,
    na=False
)

edges["is_alley"] = edges["service"].astype(str).str.contains(
    "alley",
    case=False,
    na=False
)

edges["is_parking_aisle"] = edges["service"].astype(str).str.contains(
    "parking_aisle",
    case=False,
    na=False
)

edges = edges.drop(columns=["bridge", "tunnel", "access", "service"], errors="ignore")

print("✓ Structure/access features encoded")
print(f"  Bridges: {edges['is_bridge'].sum():,}")
print(f"  Tunnels/passages: {edges['is_tunnel'].sum():,}")
print(f"  Restricted segments: {edges['restricted_access'].sum():,}")
print("")


# =========================================================
# PREPARE DATA FOR EXPORT
# =========================================================
print("Step 6: Preparing datasets for export...")

nodes = nodes.reset_index()
edges = edges.reset_index()

nodes["geometry"] = nodes["geometry"].astype(str)
edges["geometry"] = edges["geometry"].astype(str)

print("✓ Geometry converted to WKT strings for CSV export")
print("")


# =========================================================
# SAVE OUTPUT
# =========================================================
print("Step 7: Saving datasets...")

os.makedirs(OUTPUT_DIR, exist_ok=True)

nodes.to_csv(NODES_OUT, index=False)
edges.to_csv(EDGES_OUT, index=False)

print("✓ Export complete")
print("")
print("Output files:")
print(f"  {NODES_OUT}")
print(f"  {EDGES_OUT}")
print("")
print("Dataset generation finished successfully.")
print("========================================")