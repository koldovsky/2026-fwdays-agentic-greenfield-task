## ADDED Requirements

### Requirement: Category accuracy evaluator

A Langsmith custom evaluator SHALL measure whether the extracted expense category matches the expected category.

#### Scenario: Correct category prediction
- **WHEN** Langsmith evaluator receives a run with `categories=["Кафе/Ресторани"]` and expected `["Кафе/Ресторани"]`
- **THEN** the evaluator SHALL return a score of 1.0 (perfect match)

#### Scenario: Incorrect category prediction
- **WHEN** the extracted category is `["Транспорт"]` but expected is `["Кафе/Ресторани"]`
- **THEN** the evaluator SHALL return a score of 0.0 (mismatch)

#### Scenario: Multi-expense category accuracy
- **WHEN** the run contains two expenses with `categories=["Продукти", "Транспорт"]` and expected `["Продукти", "Транспорт"]`
- **THEN** the evaluator SHALL return a score of 1.0 if both match

---

### Requirement: Amount accuracy evaluator

A Langsmith custom evaluator SHALL measure whether the extracted expense amount matches the expected amount within a tolerance threshold.

#### Scenario: Exact amount match
- **WHEN** the extracted amount is 50 and expected is 50
- **THEN** the evaluator SHALL return a score of 1.0

#### Scenario: Amount off by 1 unit (within tolerance)
- **WHEN** the extracted amount is 51 and expected is 50 (1 UAH difference, within tolerance)
- **THEN** the evaluator SHALL return a score of 0.95 or higher (depending on tolerance threshold)

#### Scenario: Amount significantly different
- **WHEN** the extracted amount is 100 and expected is 50 (50% error)
- **THEN** the evaluator SHALL return a score of 0.0 or very low (significant mismatch)

#### Scenario: Multi-expense amount accuracy
- **WHEN** the run contains amounts [200, 150] and expected [200, 150]
- **THEN** the evaluator SHALL return a score of 1.0 if all amounts match

---

### Requirement: Confidence calibration evaluator

A Langsmith custom evaluator SHALL measure whether the parser's confidence scores correlate with actual accuracy (calibration).

#### Scenario: High confidence on correct prediction
- **WHEN** the parser returns confidence=0.95 and the category is correct
- **THEN** the evaluator SHALL flag this as well-calibrated (contributes to high calibration score)

#### Scenario: High confidence on incorrect prediction
- **WHEN** the parser returns confidence=0.95 but the category is incorrect
- **THEN** the evaluator SHALL flag this as poorly-calibrated (contributes to low calibration score)

#### Scenario: Low confidence on difficult input
- **WHEN** the input is vague ("купив якусь дивну річ") and the parser returns confidence=0.3
- **THEN** the evaluator SHALL recognize this as appropriate conservative confidence

---

### Requirement: Evaluators access Langsmith run metadata

Each evaluator SHALL read expense metadata from Langsmith run metadata fields (amounts, categories, confidences) to enable comparison with expected values.

#### Scenario: Evaluator reads amounts from metadata
- **WHEN** the evaluator receives a run with metadata field `amounts=[50, 30]`
- **THEN** the evaluator SHALL use these values for amount accuracy comparison

#### Scenario: Evaluator handles missing metadata gracefully
- **WHEN** a run is missing the expected metadata field (e.g., no `confidences` field)
- **THEN** the evaluator SHALL log a warning and mark the run as not evaluable for that dimension

#### Scenario: Evaluator compares against reference dataset
- **WHEN** the evaluator is configured with a reference dataset of {input, expected_category, expected_amount}
- **THEN** the evaluator SHALL look up the run's input in the reference dataset and compare
