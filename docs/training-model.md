# Training an Object Detection Model with Azure Custom Vision

This document describes the complete workflow used to create the ONNX model included in this repository.

## Overview

The goal is to train a custom Object Detection model and deploy it directly inside a .NET MAUI application.

Workflow:

```text
Collect Images
        ↓
Upload Images
        ↓
Tag Objects
        ↓
Train Model
        ↓
Evaluate Results
        ↓
Export ONNX
        ↓
Integrate into MAUI
```

---

# Step 1 – Create a Custom Vision Project

Open Azure Custom Vision.

Create a new project using the following settings:

## Project Type

```text
Object Detection
```

## Domain

```text
General (Compact)
```

This step is important.

Only Compact domains support exporting the trained model for local execution.

Without a Compact domain, ONNX export will not be available.

---

# Step 2 – Gather Training Images

For this demo, images of STOP signs were used.

Initially the dataset contained only STOP signs.

This produced a model that incorrectly identified other red road signs as STOP signs.

The dataset was later expanded with:

* No Entry signs
* Parking Prohibited signs

This improved the model's ability to distinguish between similar objects.

## Recommendation

Use images with:

* Different lighting conditions
* Different distances
* Different angles
* Different backgrounds
* Partial occlusions

Diversity is often more important than quantity.

---

# Step 3 – Upload and Tag Images

Upload all images to Custom Vision.

For each image:

1. Draw a bounding box around the object.
2. Assign the appropriate label.

Example:

```text
Label:
stop-sign
```

Repeat for all images.

---

# Step 4 – Train the Model

Start a new training iteration.

Azure will automatically:

* Process images
* Learn object features
* Generate the detection model

After training completes, review:

* Precision
* Recall
* Average Precision

These metrics provide an indication of model quality.

---

# Step 5 – Test the Model

Use the Quick Test feature.

Upload images that were not part of the training dataset.

Evaluate:

* Confidence scores
* False positives
* False negatives

Do not rely exclusively on training metrics.

Real-world testing is often more valuable.

---

# Step 6 – Improve the Dataset

When incorrect predictions occur:

1. Collect additional images.
2. Add more object classes if necessary.
3. Retrain.

Example:

Before:

```text
STOP sign only
```

Result:

```text
Many red signs classified as STOP signs
```

After:

```text
STOP
No Entry
Parking Prohibited
```

Result:

```text
Improved classification accuracy
```

The training dataset is often the largest factor affecting model quality.

---

# Step 7 – Export the Model

After achieving satisfactory results:

Open:

```text
Performance
→ Export
```

Select:

```text
ONNX
```

Download the exported model.

Typical files:

```text
model.onnx
labels.txt
```

For this project, `labels.txt` contains the three class names, one per line, in kebab-case:

```text
no-entry
parking-prohibited
stop-sign
```

---

# Step 8 – Inspect with Netron

Before writing any code, inspect the model using Netron.

Useful information:

Input:

```text
image_tensor
float32[1,3,320,320]
```

Outputs:

```text
detected_boxes
detected_classes
detected_scores
```

Understanding the model structure makes integration significantly easier.

---

# Step 9 – Integrate into .NET MAUI

Copy:

```text
model.onnx
labels.txt
```

into:

```text
Resources/Raw
```

Then use:

```text
Microsoft.ML.OnnxRuntime
```

to run local inference.

The implementation details are covered in the repository source code.

---

# Key Takeaways

* Edge AI is practical in .NET MAUI applications.
* ONNX Runtime makes local inference straightforward.
* Model quality depends heavily on training data.
* Compact domains are required for ONNX export.
* Netron is invaluable for understanding model inputs and outputs.
* Start simple, then improve the dataset iteratively.
