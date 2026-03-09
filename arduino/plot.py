import matplotlib.pyplot as plt
import csv

t, disp, var = [], [], []
with open("output.csv") as f: 
    for row in csv.reader(f):
        if len(row) == 3:
            t.append(float(row[0]))
            disp.append(float(row[1]))
            var.append(float(row[2]))


fig, (ax1, ax2) = plt.subplots(2, 1, sharex=True, figsize=(14, 6))
ax1.plot(t, disp)
ax1.set_ylabel("Displacement (m)")
ax1.set_title("Rep Counting Pipeline")
ax1.axhline(0, color='gray', linewidth=0.5)

ax2.plot(t, var, color='orange')
ax2.set_ylabel("Variance")
ax2.set_xlabel("Time (s)")
ax2.legend()

plt.tight_layout()
plt.savefig("arduino/rep_plot.png", dpi=150)
plt.show()