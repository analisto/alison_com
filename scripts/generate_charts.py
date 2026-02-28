"""
Alison.com Business Analytics — Chart Generation Pipeline
Produces 12 business charts from data/data.csv → charts/
"""

import warnings
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from pathlib import Path

warnings.filterwarnings("ignore")

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT   = Path(__file__).resolve().parent.parent
DATA   = ROOT / "data" / "data.csv"
CHARTS = ROOT / "charts"
CHARTS.mkdir(exist_ok=True)

# ── Visual constants ─────────────────────────────────────────────────────────
DPI = 150
TITLE_FS  = 14
LABEL_FS  = 11
TICK_FS   = 9
ANNOT_FS  = 8

PALETTE = {
    "primary":    "#1B3A5C",
    "secondary":  "#2E86AB",
    "accent":     "#F6AE2D",
    "positive":   "#3BB273",
    "negative":   "#E84855",
    "neutral":    "#A8B0B9",
    "bg":         "#F7F9FC",
    "grid":       "#E2E8F0",
    "text":       "#1A202C",
    "annotation": "#4A5568",
}

DURATION_ORDER = ["1.5-3", "3-4", "4-5", "5-6", "6-10", "10-15", "15-20", "20-30"]


# ── Data loading ─────────────────────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA, low_memory=False)

    # Numeric coercions
    df["enrolled"]  = pd.to_numeric(df["enrolled"],  errors="coerce").fillna(0)
    df["certified"] = pd.to_numeric(df["certified"], errors="coerce").fillna(0)
    df["rating"]    = pd.to_numeric(df["rating"],    errors="coerce")

    # Derived columns
    df["is_premium"]       = df["course_type_id"].astype(str) == "2"
    df["conversion_rate"]  = df["certified"] / df["enrolled"].replace(0, pd.NA)
    df["conversion_rate"]  = df["conversion_rate"].where(df["enrolled"] > 0)

    # Ordered duration category
    df["avg_duration"] = pd.Categorical(
        df["avg_duration"], categories=DURATION_ORDER, ordered=True
    )

    return df


# ── Shared helpers ────────────────────────────────────────────────────────────
def style_ax(ax, xlabel="", ylabel="", title=""):
    ax.set_facecolor(PALETTE["bg"])
    ax.figure.patch.set_facecolor(PALETTE["bg"])
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(PALETTE["grid"])
    ax.spines["bottom"].set_color(PALETTE["grid"])
    ax.tick_params(colors=PALETTE["annotation"], labelsize=TICK_FS)
    ax.yaxis.grid(True, color=PALETTE["grid"], linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=LABEL_FS, color=PALETTE["annotation"])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=LABEL_FS, color=PALETTE["annotation"])
    if title:
        ax.set_title(title, fontsize=TITLE_FS, color=PALETTE["text"],
                     fontweight="bold", pad=12)


def save(fig, filename: str):
    fig.tight_layout()
    fig.savefig(CHARTS / filename, dpi=DPI, bbox_inches="tight",
                facecolor=PALETTE["bg"])
    plt.close(fig)
    print(f"  Saved {filename}")


# ── Chart 01 — Category Supply vs Demand ─────────────────────────────────────
def plot_01_category_opportunity(df: pd.DataFrame):
    cat = df.groupby("category_name").agg(
        courses=("id", "count"),
        enrollments=("enrolled", "sum"),
    ).reset_index()

    cat["supply_pct"]  = cat["courses"]     / cat["courses"].sum()     * 100
    cat["demand_pct"]  = cat["enrollments"] / cat["enrollments"].sum() * 100
    cat = cat.sort_values("demand_pct", ascending=True)

    fig, ax = plt.subplots(figsize=(11, 7))
    y = range(len(cat))
    bar_h = 0.38

    ax.barh([i + bar_h/2 for i in y], cat["demand_pct"],
            height=bar_h, color=PALETTE["primary"], label="Enrollment demand %", zorder=3)
    ax.barh([i - bar_h/2 for i in y], cat["supply_pct"],
            height=bar_h, color=PALETTE["secondary"], label="Course supply %", zorder=3)

    ax.set_yticks(list(y))
    ax.set_yticklabels(cat["category_name"], fontsize=TICK_FS)
    ax.xaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    ax.legend(fontsize=TICK_FS, framealpha=0)
    style_ax(ax, xlabel="Share of total (%)",
             title="Category Supply vs Demand: Where Catalog ≠ Audience Interest")
    save(fig, "01_category_opportunity.png")


# ── Chart 02 — Conversion by Category ────────────────────────────────────────
def plot_02_conversion_by_category(df: pd.DataFrame):
    cat = df.groupby("category_name").agg(
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    cat = cat[cat["enrolled"] > 0]
    cat["conv"] = cat["certified"] / cat["enrolled"] * 100
    cat = cat.sort_values("conv", ascending=True)

    avg = cat["conv"].mean()
    colors = [PALETTE["positive"] if v >= avg else PALETTE["negative"]
              for v in cat["conv"]]

    fig, ax = plt.subplots(figsize=(11, 7))
    bars = ax.barh(cat["category_name"], cat["conv"], color=colors, zorder=3)
    ax.axvline(avg, color=PALETTE["accent"], linewidth=1.8,
               linestyle="--", label=f"Platform avg {avg:.1f}%", zorder=4)

    for bar, val in zip(bars, cat["conv"]):
        ax.text(val + 0.2, bar.get_y() + bar.get_height()/2,
                f"{val:.1f}%", va="center", fontsize=ANNOT_FS,
                color=PALETTE["annotation"])

    ax.xaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    ax.legend(fontsize=TICK_FS, framealpha=0)
    style_ax(ax, xlabel="Certification conversion rate",
             title="Certification Conversion Rate by Category")
    save(fig, "02_conversion_by_category.png")


# ── Chart 03 — Top Publishers: Volume vs Conversion ──────────────────────────
def plot_03_top_publishers(df: pd.DataFrame):
    pub = df.groupby("publisher_display_name").agg(
        enrollments=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    pub = pub[pub["enrollments"] > 0]
    pub["conv"] = pub["certified"] / pub["enrollments"] * 100
    pub = pub.nlargest(15, "enrollments").sort_values("enrollments", ascending=True)

    fig, ax1 = plt.subplots(figsize=(12, 7))
    ax2 = ax1.twinx()

    y = range(len(pub))
    ax1.barh(list(y), pub["enrollments"] / 1e6,
             color=PALETTE["primary"], height=0.6, label="Enrollments (M)", zorder=3)
    ax2.plot(pub["conv"], list(y), color=PALETTE["accent"],
             marker="D", markersize=6, linewidth=2, label="Conversion %", zorder=4)

    ax1.set_yticks(list(y))
    ax1.set_yticklabels(pub["publisher_display_name"], fontsize=TICK_FS)
    ax1.set_xlabel("Total enrollments (millions)", fontsize=LABEL_FS,
                   color=PALETTE["annotation"])
    ax2.set_ylabel("Conversion rate (%)", fontsize=LABEL_FS,
                   color=PALETTE["accent"])
    ax2.tick_params(axis="y", colors=PALETTE["accent"], labelsize=TICK_FS)
    ax2.spines["right"].set_color(PALETTE["accent"])

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2,
               fontsize=TICK_FS, framealpha=0, loc="lower right")

    style_ax(ax1, title="Top 15 Publishers: Enrollment Volume vs Certification Rate")
    ax1.set_facecolor(PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])
    save(fig, "03_top_publishers.png")


# ── Chart 04 — Enrollment Funnel ─────────────────────────────────────────────
def plot_04_enrollment_funnel(df: pd.DataFrame):
    cat = df.groupby("category_name").agg(
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    cat["dropout"] = cat["enrolled"] - cat["certified"]
    cat = cat.sort_values("enrolled", ascending=True)

    fig, ax = plt.subplots(figsize=(11, 7))
    y = range(len(cat))

    ax.barh(list(y), cat["certified"] / 1e6,
            color=PALETTE["positive"], label="Certified", zorder=3)
    ax.barh(list(y), cat["dropout"] / 1e6,
            left=cat["certified"] / 1e6,
            color=PALETTE["negative"], alpha=0.6, label="Did not complete", zorder=3)

    ax.set_yticks(list(y))
    ax.set_yticklabels(cat["category_name"], fontsize=TICK_FS)
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.1f}M"))
    ax.legend(fontsize=TICK_FS, framealpha=0)
    style_ax(ax, xlabel="Learners (millions)",
             title="Enrollment Funnel: Certified vs Dropout by Category")
    save(fig, "04_enrollment_funnel.png")


# ── Chart 05 — Level Performance ─────────────────────────────────────────────
def plot_05_level_performance(df: pd.DataFrame):
    df2 = df.copy()
    df2["level"] = df2["level"].astype(str)
    lvl = df2.groupby("level").agg(
        courses=("id", "count"),
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    lvl = lvl[lvl["level"].isin(["1", "2", "3"])].sort_values("level")
    lvl["enroll_share"] = lvl["enrolled"] / lvl["enrolled"].sum() * 100
    lvl["conv"]         = lvl["certified"] / lvl["enrolled"] * 100
    lvl["level_label"]  = lvl["level"].map({"1": "Beginner", "2": "Intermediate", "3": "Advanced"})

    x = range(len(lvl))
    width = 0.38
    fig, ax = plt.subplots(figsize=(9, 6))

    ax.bar([i - width/2 for i in x], lvl["enroll_share"],
           width=width, color=PALETTE["primary"], label="Enrollment share %", zorder=3)
    ax.bar([i + width/2 for i in x], lvl["conv"],
           width=width, color=PALETTE["secondary"], label="Conversion rate %", zorder=3)

    ax.set_xticks(list(x))
    ax.set_xticklabels(lvl["level_label"], fontsize=TICK_FS)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))

    for i, row in enumerate(lvl.itertuples()):
        ax.text(i - width/2, row.enroll_share + 0.5, f"{row.enroll_share:.1f}%",
                ha="center", fontsize=ANNOT_FS, color=PALETTE["annotation"])
        ax.text(i + width/2, row.conv + 0.5, f"{row.conv:.1f}%",
                ha="center", fontsize=ANNOT_FS, color=PALETTE["annotation"])

    ax.legend(fontsize=TICK_FS, framealpha=0)
    style_ax(ax, ylabel="Percentage (%)",
             title="Course Difficulty: Enrollment Share & Conversion Rate")
    save(fig, "05_level_performance.png")


# ── Chart 06 — Content Format Impact ─────────────────────────────────────────
def plot_06_content_format_impact(df: pd.DataFrame):
    def fmt_label(row):
        if row["contains_video"] == 1:
            return "Video"
        elif row["contains_audio"] == 1:
            return "Audio"
        else:
            return "Non-Video / Text"

    df2 = df.copy()
    df2["contains_video"] = pd.to_numeric(df2["contains_video"], errors="coerce").fillna(0)
    df2["contains_audio"] = pd.to_numeric(df2["contains_audio"], errors="coerce").fillna(0)
    df2["format"] = df2.apply(fmt_label, axis=1)

    fmt = df2.groupby("format").agg(
        courses=("id", "count"),
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    fmt = fmt[fmt["enrolled"] > 0]
    fmt["conv"] = fmt["certified"] / fmt["enrolled"] * 100
    fmt["enroll_share"] = fmt["enrolled"] / fmt["enrolled"].sum() * 100

    order = ["Video", "Audio", "Non-Video / Text"]
    fmt["format"] = pd.Categorical(fmt["format"], categories=order, ordered=True)
    fmt = fmt.sort_values("format")

    x = range(len(fmt))
    width = 0.38
    fig, ax = plt.subplots(figsize=(9, 6))

    ax.bar([i - width/2 for i in x], fmt["enroll_share"],
           width=width, color=PALETTE["primary"], label="Enrollment share %", zorder=3)
    ax.bar([i + width/2 for i in x], fmt["conv"],
           width=width, color=PALETTE["accent"], label="Conversion rate %", zorder=3)

    ax.set_xticks(list(x))
    ax.set_xticklabels(fmt["format"], fontsize=TICK_FS)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))

    for i, row in enumerate(fmt.itertuples()):
        ax.text(i - width/2, row.enroll_share + 0.5, f"{row.enroll_share:.1f}%",
                ha="center", fontsize=ANNOT_FS, color=PALETTE["annotation"])
        ax.text(i + width/2, row.conv + 0.5, f"{row.conv:.1f}%",
                ha="center", fontsize=ANNOT_FS, color=PALETTE["annotation"])

    ax.legend(fontsize=TICK_FS, framealpha=0)
    style_ax(ax, ylabel="Percentage (%)",
             title="Content Format: Enrollment Share vs Certification Conversion")
    save(fig, "06_content_format_impact.png")


# ── Chart 07 — Skills Demand Map ─────────────────────────────────────────────
def plot_07_skills_demand_map(df: pd.DataFrame):
    tags = (
        df["tags"]
        .dropna()
        .str.split("|")
        .explode()
        .str.strip()
        .loc[lambda s: s != ""]
        .value_counts()
        .head(20)
        .sort_values(ascending=True)
    )

    colors = [PALETTE["accent"] if i >= len(tags) - 5 else PALETTE["primary"]
              for i in range(len(tags))]

    fig, ax = plt.subplots(figsize=(11, 8))
    ax.barh(tags.index, tags.values, color=colors, zorder=3)

    for i, (tag, val) in enumerate(zip(tags.index, tags.values)):
        ax.text(val + 5, i, str(val), va="center", fontsize=ANNOT_FS,
                color=PALETTE["annotation"])

    ax.set_xlabel("Number of courses", fontsize=LABEL_FS, color=PALETTE["annotation"])
    style_ax(ax, title="Top 20 Skills by Course Count")
    save(fig, "07_skills_demand_map.png")


# ── Chart 08 — Rating Distribution ───────────────────────────────────────────
def plot_08_rating_distribution(df: pd.DataFrame):
    rated = df[df["rating"].notna()].copy()
    rated["rating_int"] = rated["rating"].astype(int)
    dist = rated["rating_int"].value_counts().sort_index()

    colors = [PALETTE["accent"] if r == 3 else PALETTE["primary"]
              for r in dist.index]

    fig, ax = plt.subplots(figsize=(9, 6))
    bars = ax.bar(dist.index.astype(str), dist.values, color=colors, zorder=3)

    pct_3 = dist.get(3, 0) / dist.sum() * 100
    ax.text(
        dist.index.tolist().index(3),
        dist.get(3, 0) + dist.max() * 0.02,
        f"{pct_3:.1f}% of courses\nrated exactly 3★",
        ha="center", fontsize=ANNOT_FS, color=PALETTE["negative"],
        fontweight="bold"
    )

    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
    style_ax(ax, xlabel="Star rating", ylabel="Number of courses",
             title="Course Rating Distribution: A Broken Signal")
    save(fig, "08_rating_distribution.png")


# ── Chart 09 — Standard vs Premium ───────────────────────────────────────────
def plot_09_standard_vs_premium(df: pd.DataFrame):
    grp = df.groupby("is_premium").agg(
        courses=("id", "count"),
        avg_enrolled=("enrolled", "mean"),
        total_enrolled=("enrolled", "sum"),
        total_certified=("certified", "sum"),
    ).reset_index()
    grp["conv"] = grp["total_certified"] / grp["total_enrolled"] * 100
    grp["catalog_share"] = grp["courses"] / grp["courses"].sum() * 100
    grp["label"] = grp["is_premium"].map({False: "Standard", True: "Premium"})

    metrics = ["catalog_share", "conv"]
    metric_labels = ["Catalog share (%)", "Conversion rate (%)"]
    fig, axes = plt.subplots(1, 2, figsize=(11, 6))

    for ax, metric, mlabel in zip(axes, metrics, metric_labels):
        bars = ax.bar(grp["label"], grp[metric],
                      color=[PALETTE["primary"], PALETTE["accent"]], zorder=3)
        for bar, val in zip(bars, grp[metric]):
            ax.text(bar.get_x() + bar.get_width()/2, val + 0.5,
                    f"{val:.1f}%", ha="center", fontsize=ANNOT_FS,
                    color=PALETTE["annotation"])
        ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
        style_ax(ax, ylabel=mlabel, title=mlabel)

    fig.suptitle("Standard vs Premium Courses: Catalog vs Conversion",
                 fontsize=TITLE_FS, color=PALETTE["text"], fontweight="bold", y=1.01)
    save(fig, "09_standard_vs_premium.png")


# ── Chart 10 — Duration vs Performance ───────────────────────────────────────
def plot_10_duration_vs_performance(df: pd.DataFrame):
    dur = df.groupby("avg_duration", observed=True).agg(
        avg_enrolled=("enrolled", "mean"),
        total_enrolled=("enrolled", "sum"),
        total_certified=("certified", "sum"),
    ).reset_index()
    dur = dur[dur["total_enrolled"] > 0].copy()
    dur["conv"] = dur["total_certified"] / dur["total_enrolled"] * 100

    fig, ax1 = plt.subplots(figsize=(11, 6))
    ax2 = ax1.twinx()

    x = range(len(dur))
    ax1.bar(list(x), dur["avg_enrolled"] / 1e3,
            color=PALETTE["primary"], zorder=3, label="Avg enrollment (K)")
    ax2.plot(list(x), dur["conv"], color=PALETTE["accent"],
             marker="o", markersize=7, linewidth=2.5, label="Conversion %", zorder=4)

    ax1.set_xticks(list(x))
    ax1.set_xticklabels(dur["avg_duration"].astype(str), fontsize=TICK_FS)
    ax1.set_xlabel("Course duration (hours)", fontsize=LABEL_FS,
                   color=PALETTE["annotation"])
    ax1.set_ylabel("Avg enrollments (thousands)", fontsize=LABEL_FS,
                   color=PALETTE["annotation"])
    ax2.set_ylabel("Conversion rate (%)", fontsize=LABEL_FS, color=PALETTE["accent"])
    ax2.tick_params(axis="y", colors=PALETTE["accent"], labelsize=TICK_FS)
    ax2.spines["right"].set_color(PALETTE["accent"])

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2,
               fontsize=TICK_FS, framealpha=0, loc="upper right")

    style_ax(ax1, title="Course Duration vs Avg Enrollment & Conversion Rate")
    ax1.set_facecolor(PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])
    save(fig, "10_duration_vs_performance.png")


# ── Chart 11 — Environment Breakdown ─────────────────────────────────────────
def plot_11_environment_breakdown(df: pd.DataFrame):
    env_df = df[df["environment_name"].notna() & (df["environment_name"] != "")].copy()
    env = env_df.groupby("environment_name").agg(
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    env = env[env["enrolled"] > 0].copy()
    env["conv"] = env["certified"] / env["enrolled"] * 100
    env = env.sort_values("enrolled", ascending=True)

    fig, ax1 = plt.subplots(figsize=(11, 6))
    ax2 = ax1.twinx()

    y = range(len(env))
    ax1.barh(list(y), env["enrolled"] / 1e6,
             color=PALETTE["primary"], height=0.55, label="Enrollments (M)", zorder=3)
    ax2.plot(env["conv"], list(y), color=PALETTE["accent"],
             marker="D", markersize=6, linewidth=2, label="Conversion %", zorder=4)

    ax1.set_yticks(list(y))
    ax1.set_yticklabels(env["environment_name"], fontsize=TICK_FS)
    ax1.set_xlabel("Total enrollments (millions)", fontsize=LABEL_FS,
                   color=PALETTE["annotation"])
    ax2.set_ylabel("Conversion rate (%)", fontsize=LABEL_FS, color=PALETTE["accent"])
    ax2.tick_params(axis="y", colors=PALETTE["accent"], labelsize=TICK_FS)
    ax2.spines["right"].set_color(PALETTE["accent"])

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2,
               fontsize=TICK_FS, framealpha=0, loc="lower right")

    style_ax(ax1, title="Learning Environment: Enrollment Volume & Conversion Rate")
    ax1.set_facecolor(PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])
    save(fig, "11_environment_breakdown.png")


# ── Chart 12 — Publisher Efficiency Scatter ───────────────────────────────────
def plot_12_publisher_efficiency(df: pd.DataFrame):
    pub = df.groupby("publisher_display_name").agg(
        courses=("id", "count"),
        enrolled=("enrolled", "sum"),
        certified=("certified", "sum"),
    ).reset_index()
    pub = pub[pub["enrolled"] >= 1_000].copy()
    pub["conv"] = pub["certified"] / pub["enrolled"] * 100

    # Outlier score for annotation: high conv + reasonable enrollment
    pub["outlier_score"] = pub["conv"] * (pub["enrolled"] ** 0.3)
    top5 = pub.nlargest(5, "outlier_score")

    fig, ax = plt.subplots(figsize=(11, 7))

    scatter = ax.scatter(
        pub["courses"], pub["conv"],
        s=pub["enrolled"] / pub["enrolled"].max() * 800 + 20,
        c=PALETTE["secondary"], alpha=0.55, edgecolors=PALETTE["primary"],
        linewidths=0.5, zorder=3
    )

    for _, row in top5.iterrows():
        ax.annotate(
            row["publisher_display_name"],
            (row["courses"], row["conv"]),
            textcoords="offset points", xytext=(6, 4),
            fontsize=ANNOT_FS, color=PALETTE["negative"],
        )

    ax.set_xscale("log")
    ax.set_xlabel("Number of courses (log scale)", fontsize=LABEL_FS,
                  color=PALETTE["annotation"])
    ax.set_ylabel("Certification conversion rate (%)", fontsize=LABEL_FS,
                  color=PALETTE["annotation"])
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f%%"))
    style_ax(ax, title="Publisher Efficiency: Course Volume vs Conversion Rate\n"
             "(bubble size = total enrollments)")
    save(fig, "12_publisher_efficiency.png")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("Loading data...")
    df = load_data()
    print(f"  Rows: {len(df):,}  |  Enrolled: {df['enrolled'].sum()/1e6:.1f}M  "
          f"|  Publishers: {df['publisher_display_name'].nunique()}")

    print("Generating charts...")
    plot_01_category_opportunity(df)
    plot_02_conversion_by_category(df)
    plot_03_top_publishers(df)
    plot_04_enrollment_funnel(df)
    plot_05_level_performance(df)
    plot_06_content_format_impact(df)
    plot_07_skills_demand_map(df)
    plot_08_rating_distribution(df)
    plot_09_standard_vs_premium(df)
    plot_10_duration_vs_performance(df)
    plot_11_environment_breakdown(df)
    plot_12_publisher_efficiency(df)

    print("\nAll 12 charts saved")


if __name__ == "__main__":
    main()
