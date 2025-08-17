"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"

interface VaccineRecord {
  id: string
  patientName: string
  vaccineName: string
  manufacturer: string
  doseNumber: number
  totalDoses: number
  dateGiven: Date
  administeredBy: string
  notes: string
  status: "completed" | "pending"
  nextDueDate?: Date
}

const COMMON_VACCINES = [
  "COVID-19 mRNA (Pfizer-BioNTech)",
  "COVID-19 mRNA (Moderna)",
  "COVID-19 (Johnson & Johnson)",
  "Influenza (Flu)",
  "Hepatitis A",
  "Hepatitis B",
  "Measles-Mumps-Rubella (MMR)",
  "Tetanus-Diphtheria-Pertussis (Tdap)",
  "Varicella (Chickenpox)",
  "Pneumococcal",
  "Meningococcal",
  "HPV (Human Papillomavirus)",
  "Shingles (Zoster)",
  "Typhoid",
  "Yellow Fever",
  "Enter Custom Name...",
]

const MANUFACTURERS = [
  "Pfizer-BioNTech",
  "Moderna",
  "Johnson & Johnson",
  "AstraZeneca",
  "GSK",
  "Merck",
  "Sanofi",
  "Serum Institute",
  "Bharat Biotech",
  "Other",
]

export default function AddVaccineScreen() {
  const [formData, setFormData] = useState({
    patientName: "John Doe",
    vaccineName: "",
    manufacturer: "",
    doseNumber: 1,
    totalDoses: 1,
    dateGiven: new Date(),
    administeredBy: "",
    notes: "",
    exactDateKnown: true,
  })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showVaccinePicker, setShowVaccinePicker] = useState(false)
  const [showManufacturerPicker, setShowManufacturerPicker] = useState(false)
  const [showCustomVaccineInput, setShowCustomVaccineInput] = useState(false)
  const [customVaccineName, setCustomVaccineName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const validateForm = () => {
    if (!formData.patientName.trim()) {
      Alert.alert("Validation Error", "Patient name is required.")
      return false
    }
    if (!formData.vaccineName.trim()) {
      Alert.alert("Validation Error", "Vaccine name is required.")
      return false
    }
    if (formData.doseNumber < 1 || formData.totalDoses < 1) {
      Alert.alert("Validation Error", "Dose numbers must be positive.")
      return false
    }
    if (formData.doseNumber > formData.totalDoses) {
      Alert.alert("Validation Error", "Dose number cannot exceed total doses.")
      return false
    }
    return true
  }

  const calculateNextDueDate = () => {
    if (formData.doseNumber < formData.totalDoses) {
      const daysToAdd = getRecommendedInterval(formData.vaccineName)
      return new Date(formData.dateGiven.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    }
    return undefined
  }

  const getRecommendedInterval = (vaccineName: string): number => {
    if (vaccineName.includes("COVID-19")) return 21 // 3 weeks
    if (vaccineName.includes("Hepatitis B")) return 30 // 1 month
    if (vaccineName.includes("HPV")) return 60 // 2 months
    return 30 // Default 1 month
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const existingRecords = await AsyncStorage.getItem("vaccineRecords")
      const records = existingRecords ? JSON.parse(existingRecords) : []

      const existingPendingIndex = records.findIndex(
        (record: VaccineRecord) =>
          record.vaccineName.toLowerCase() === formData.vaccineName.toLowerCase() &&
          record.status === "pending" &&
          record.patientName === formData.patientName,
      )

      if (existingPendingIndex !== -1) {
        records[existingPendingIndex] = {
          ...records[existingPendingIndex],
          status: "completed",
          dateGiven: formData.dateGiven,
          administeredBy: formData.administeredBy,
          notes: formData.notes,
          doseNumber: formData.doseNumber,
          totalDoses: formData.totalDoses,
          manufacturer: formData.manufacturer,
          nextDueDate: calculateNextDueDate(),
        }

        Alert.alert(
          "Success! 🎉",
          `Pending vaccine "${formData.vaccineName}" has been marked as completed and moved to vaccinated records!`,
          [
            {
              text: "Add Another",
              onPress: () => resetForm(),
            },
            {
              text: "View Records",
              onPress: () => router.push("/(tabs)"),
            },
          ],
        )
      } else {
        const newRecord: VaccineRecord = {
          id: Date.now().toString(),
          patientName: formData.patientName,
          vaccineName: formData.vaccineName,
          manufacturer: formData.manufacturer,
          doseNumber: formData.doseNumber,
          totalDoses: formData.totalDoses,
          dateGiven: formData.dateGiven,
          administeredBy: formData.administeredBy,
          notes: formData.notes,
          status: "completed",
          nextDueDate: calculateNextDueDate(),
        }

        records.push(newRecord)

        Alert.alert("Success! 🎉", "New vaccination record has been added to your vaccinated records!", [
          {
            text: "Add Another",
            onPress: () => resetForm(),
          },
          {
            text: "View Records",
            onPress: () => router.push("/(tabs)"),
          },
        ])
      }

      await AsyncStorage.setItem("vaccineRecords", JSON.stringify(records))

      setTimeout(() => {
        router.push("/(tabs)")
      }, 200)
    } catch (error) {
      console.error("Error saving record:", error)
      Alert.alert("Error", "Failed to save vaccination record. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      patientName: "John Doe",
      vaccineName: "",
      manufacturer: "",
      doseNumber: 1,
      totalDoses: 1,
      dateGiven: new Date(),
      administeredBy: "",
      notes: "",
      exactDateKnown: true,
    })
  }

  const handleVaccineSelection = (vaccine: string) => {
    if (vaccine === "Enter Custom Name...") {
      setShowVaccinePicker(false)
      setShowCustomVaccineInput(true)
    } else {
      setFormData({ ...formData, vaccineName: vaccine })
      setShowVaccinePicker(false)
    }
  }

  const handleCustomVaccineSubmit = () => {
    if (customVaccineName.trim()) {
      setFormData({ ...formData, vaccineName: customVaccineName.trim() })
      setCustomVaccineName("")
      setShowCustomVaccineInput(false)
    } else {
      Alert.alert("Error", "Please enter a vaccine name")
    }
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day)
    setFormData({ ...formData, dateGiven: selectedDate })
    setShowDatePicker(false)
  }

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction
    let newYear = currentYear

    if (newMonth > 11) {
      newMonth = 0
      newYear++
    } else if (newMonth < 0) {
      newMonth = 11
      newYear--
    }

    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString()
      const isSelected = formData.dateGiven.toDateString() === new Date(currentYear, currentMonth, day).toDateString()

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isToday && styles.todayDay, isSelected && styles.selectedDay]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[styles.calendarDayText, isToday && styles.todayText, isSelected && styles.selectedText]}>
            {day}
          </Text>
        </TouchableOpacity>,
      )
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>{days}</View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <Ionicons name="add-circle" size={24} color="#2196F3" />
          <Text style={styles.headerTitle}>Add New Vaccination Record</Text>
          <Text style={styles.headerSubtitle}>Record a completed vaccination</Text>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Patient Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full patient name"
              value={formData.patientName}
              onChangeText={(text) => setFormData({ ...formData, patientName: text })}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Vaccine Name *</Text>

            <TextInput
              style={[styles.input, styles.primaryInput]}
              placeholder="Type vaccine name directly here..."
              value={formData.vaccineName}
              onChangeText={(text) => setFormData({ ...formData, vaccineName: text })}
              autoCapitalize="words"
            />

            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowVaccinePicker(true)}>
              <Text style={styles.pickerText}>Or select from common vaccines</Text>
              <Ionicons name="chevron-down" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Manufacturer</Text>
              <TextInput
                style={[styles.input, styles.smallInput]}
                placeholder="Enter manufacturer"
                value={formData.manufacturer}
                onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
                autoCapitalize="words"
              />
              <TouchableOpacity style={styles.smallPickerButton} onPress={() => setShowManufacturerPicker(true)}>
                <Text style={styles.smallPickerText}>Select</Text>
                <Ionicons name="chevron-down" size={16} color="#2196F3" />
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Dose Information</Text>
              <View style={styles.doseContainer}>
                <TextInput
                  style={styles.doseInput}
                  value={formData.doseNumber.toString()}
                  onChangeText={(text) => setFormData({ ...formData, doseNumber: Number.parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <Text style={styles.doseText}>of</Text>
                <TextInput
                  style={styles.doseInput}
                  value={formData.totalDoses.toString()}
                  onChangeText={(text) => setFormData({ ...formData, totalDoses: Number.parseInt(text) || 1 })}
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, exactDateKnown: !formData.exactDateKnown })}
              >
                {formData.exactDateKnown && <Ionicons name="checkmark" size={16} color="#2196F3" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>I know the exact date when this vaccine was given</Text>
            </View>

            <TouchableOpacity
              style={[styles.dateButton, !formData.exactDateKnown && styles.disabledButton]}
              onPress={() => formData.exactDateKnown && setShowDatePicker(true)}
              disabled={!formData.exactDateKnown}
            >
              <Text style={[styles.dateButtonText, !formData.exactDateKnown && styles.disabledText]}>
                {formData.exactDateKnown ? formData.dateGiven.toLocaleDateString() : "Date unknown"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={formData.exactDateKnown ? "#2196F3" : "#ccc"} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Administered By</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Smith, Clinic Name, etc."
              value={formData.administeredBy}
              onChangeText={(text) => setFormData({ ...formData, administeredBy: text })}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes & Observations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional notes, side effects, or observations..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              autoCapitalize="sentences"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? "Adding Record..." : "Add Vaccination Record"}</Text>
          </TouchableOpacity>
        </ScrollView>

        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.calendarModal}>
                <Text style={styles.modalTitle}>Select Date</Text>
                {renderCalendar()}
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <Modal
          visible={showVaccinePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowVaccinePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vaccine</Text>
                <TouchableOpacity onPress={() => setShowVaccinePicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {COMMON_VACCINES.map((vaccine) => (
                  <TouchableOpacity
                    key={vaccine}
                    style={[styles.modalItem, vaccine === "Enter Custom Name..." && styles.customOption]}
                    onPress={() => handleVaccineSelection(vaccine)}
                  >
                    <Text style={[styles.modalItemText, vaccine === "Enter Custom Name..." && styles.customOptionText]}>
                      {vaccine === "Enter Custom Name..." ? "✏️ Enter Custom Name..." : vaccine}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showCustomVaccineInput}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCustomVaccineInput(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customInputContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Custom Vaccine Name</Text>
                <TouchableOpacity onPress={() => setShowCustomVaccineInput(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.customInputContent}>
                <Text style={styles.customInputLabel}>Vaccine Name *</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter the vaccine name..."
                  value={customVaccineName}
                  onChangeText={setCustomVaccineName}
                  autoFocus={true}
                  autoCapitalize="words"
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setCustomVaccineName("")
                      setShowCustomVaccineInput(false)
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={handleCustomVaccineSubmit}>
                    <Text style={styles.confirmButtonText}>Add Vaccine</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showManufacturerPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowManufacturerPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Manufacturer</Text>
                <TouchableOpacity onPress={() => setShowManufacturerPicker(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {MANUFACTURERS.map((manufacturer) => (
                  <TouchableOpacity
                    key={manufacturer}
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData({ ...formData, manufacturer: manufacturer })
                      setShowManufacturerPicker(false)
                    }}
                  >
                    <Text style={styles.modalItemText}>{manufacturer}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  primaryInput: {
    borderColor: "#2196F3",
    borderWidth: 2,
    marginBottom: 8,
  },
  smallInput: {
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  pickerText: {
    fontSize: 14,
    color: "#2196F3",
  },
  smallPickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#f8f9fa",
  },
  smallPickerText: {
    fontSize: 12,
    color: "#2196F3",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  doseContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  doseInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
  },
  doseText: {
    marginHorizontal: 8,
    fontSize: 16,
    color: "#666",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#2196F3",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  disabledButton: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ccc",
  },
  disabledText: {
    color: "#ccc",
  },
  submitButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModal: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  calendar: {
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  navButton: {
    padding: 10,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    width: 35,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  calendarDay: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    borderRadius: 17,
  },
  calendarDayText: {
    fontSize: 14,
    color: "#333",
  },
  todayDay: {
    backgroundColor: "#E3F2FD",
  },
  todayText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  selectedDay: {
    backgroundColor: "#2196F3",
  },
  selectedText: {
    color: "white",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  customInputContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
  },
  customInputContent: {
    padding: 20,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 2,
    borderColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  customInputButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  customOption: {
    backgroundColor: "#E3F2FD",
  },
  customOptionText: {
    color: "#2196F3",
    fontWeight: "600",
  },
})
