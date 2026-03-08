#define _USE_MATH_DEFINES
#include <cmath>
#include <algorithm>

/* -------------------- Constants -------------------- */
const int cutoffFrequency    = 10;    // Hz
const float sensor_max_acc   = 19.62; // m/s^2, from sketch.ino
const float sensor_max_gyro = 8.727;  // rad/s, from sketch.ino

/* -------------------- Custum Types -------------------- */
struct Vector3 {
    float x, y, z;
};

struct ImuData {
    Vector3 acc; // g
    Vector3 gyro; // rad/s
    unsigned long time_ms; // millis()
};

struct LowPassFilter {
    ImuData last_output;
    bool initialised;
};

/* -------------------- HELPER FUNCTIONS -------------------- */
// Helper function to clamp values between lo and hi
static float clamp(float x, float low, float high) {
    return x < low ? low : (x > high ? high : x);
}

/*
 * Function that applies a low pass filter to data from an IMU
 * Inputs: current IMU data, the previous LowPassFilter result
 * Output: value of sensor with low-pass-filter
 * 
 * Equation: filtered[n] = alpha  * x[n] + (1 - alpha) * filtered[n-1]
 * where
 * - x[n] = current raw sample 
 * - filtered[n-1] = previous filtered output
 * - alpha = dt / (dt + RC)
 * - RC = 1 / (2 * pi * cuttoffFrequency)
*/
ImuData applyLowPassFilter(ImuData current, LowPassFilter &filter) {
    // If the filter hasn't been initialised, just return the current data
    if (!filter.initialised) {
        filter.last_output = current;
        filter.initialised = true;
        return current;
    }

    // Caluclating the alpha value
    float dt = (current.time_ms - filter.last_output.time_ms) / 1000.0f;
    float RC = 1.0f / (2.0f * M_PI * cutoffFrequency);
    float alpha = dt / (dt + RC);

    // Initialise the filtered ImuData value and populate with the filtered data (see equation)
    ImuData filtered;
    filtered.time_ms = current.time_ms;

    filtered.acc.x = alpha * current.acc.x + (1 - alpha) * filter.last_output.acc.x;
    filtered.acc.y = alpha * current.acc.y + (1 - alpha) * filter.last_output.acc.y;
    filtered.acc.z = alpha * current.acc.z + (1 - alpha) * filter.last_output.acc.z;

    filtered.gyro.x = alpha * current.gyro.x + (1 - alpha) * filter.last_output.gyro.x;
    filtered.gyro.y = alpha * current.gyro.y + (1 - alpha) * filter.last_output.gyro.y;
    filtered.gyro.z = alpha * current.gyro.z + (1 - alpha) * filter.last_output.gyro.z;

    filter.last_output = filtered;
    return filtered;
}


/*
 * Normalise IMU data to [-1, 1]
 * Input: ImuData imu_dat (acc in m/s^2, gyro in rad/s)
 * Output: ImuData with all fields scaled to [-1, 1]
 * 
 * Equation: normalised = x / sensor_max
 * where 
 * - sensor_max for ac   = 19.62 m/s^2 (+/-2g, MPU6050_RANGE_2_G)
 * - sensor_max for gyro = 8.727 rad/s (+/-500 deg/s, MPU6060_RAGE_500_DEG)
*/
ImuData normaliseImu(ImuData current){
    ImuData normalised;

    // Acceleration
    normalised.acc.x = clamp(current.acc.x / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.y = clamp(current.acc.y / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.z = clamp(current.acc.z / sensor_max_acc, -1.0f, 1.0f);

    // Gyro
    normalised.gyro.x = clamp(current.gyro.x / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.y = clamp(current.gyro.y / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.z = clamp(current.gyro.z / sensor_max_gyro, -1.0f, 1.0f);

    // Time
    normalised.time_ms = current.time_ms;

    return normalised;
}

