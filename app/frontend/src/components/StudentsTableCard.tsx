"use client";

import { Add, Close, Delete, People, Save, Sync } from "@mui/icons-material";
import {
    Box,
    Button,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api/proxy";

type StudentRow = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  isNew?: boolean;
};

type DbHealthResponse = {
  seeded?: boolean;
};

export default function StudentsTableCard() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    firstname: "",
    lastname: "",
    email: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const editingRow = useMemo(
    () => students.find((student) => student.id === editingId) ?? null,
    [students, editingId]
  );

  const loadStudents = async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const response = await fetch(`${API_BASE}/students`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const dbHealthResponse = await fetch(`${API_BASE}/health/db`, {
          cache: "no-store",
        });
        if (dbHealthResponse.ok) {
          const dbHealthData = (await dbHealthResponse.json()) as DbHealthResponse;
          if (dbHealthData.seeded === false) {
            throw new Error(
              "Database is not seeded yet. Seed it first from Tier Connectivity."
            );
          }
        }
        throw new Error("Failed to load students");
      }
      const data = (await response.json()) as StudentRow[];
      setStudents(data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Database is not seeded yet")
      ) {
        setStudentsError(error.message);
      } else {
        setStudentsError("Unable to load students from the API.");
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const startEdit = (student: StudentRow) => {
    if (savingId) {
      return;
    }
    setEditingId(student.id);
    setDraft({
      firstname: student.firstname,
      lastname: student.lastname,
      email: student.email,
    });
  };

  const cancelEdit = () => {
    if (editingRow?.isNew) {
      setStudents((prev) => prev.filter((student) => student.id !== editingRow.id));
    }
    setEditingId(null);
  };

  const addStudent = () => {
    const tempId = `new-${crypto.randomUUID()}`;
    const newRow: StudentRow = {
      id: tempId,
      firstname: "",
      lastname: "",
      email: "",
      isNew: true,
    };
    setStudents((prev) => [newRow, ...prev]);
    setEditingId(tempId);
    setDraft({ firstname: "", lastname: "", email: "" });
  };

  const isDirty = useMemo(() => {
    if (!editingRow) {
      return false;
    }
    if (editingRow.isNew) {
      return (
        draft.firstname.trim() !== "" ||
        draft.lastname.trim() !== "" ||
        draft.email.trim() !== ""
      );
    }
    return (
      draft.firstname !== editingRow.firstname ||
      draft.lastname !== editingRow.lastname ||
      draft.email !== editingRow.email
    );
  }, [editingRow, draft]);

  const canSave =
    !!editingRow &&
    draft.firstname.trim() !== "" &&
    draft.lastname.trim() !== "" &&
    draft.email.trim() !== "" &&
    (editingRow.isNew ? true : isDirty);

  const saveStudent = async () => {
    if (!editingRow) {
      return;
    }
    setSavingId(editingRow.id);
    setStudentsError(null);
    const payload = {
      firstname: draft.firstname.trim(),
      lastname: draft.lastname.trim(),
      email: draft.email.trim(),
    };
    try {
      if (editingRow.isNew) {
        const response = await fetch(`${API_BASE}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Create failed");
        }
        const created = (await response.json()) as StudentRow;
        setStudents((prev) =>
          prev.map((student) => (student.id === editingRow.id ? created : student))
        );
      } else {
        const response = await fetch(`${API_BASE}/students/${editingRow.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Update failed");
        }
        const updated = (await response.json()) as StudentRow;
        setStudents((prev) =>
          prev.map((student) =>
            student.id === editingRow.id ? updated : student
          )
        );
      }
      setEditingId(null);
    } catch (error) {
      setStudentsError("Unable to save student changes.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteStudent = async (student: StudentRow) => {
    if (savingId) {
      return;
    }
    if (student.isNew) {
      setStudents((prev) => prev.filter((row) => row.id !== student.id));
      if (editingId === student.id) {
        setEditingId(null);
      }
      return;
    }
    setSavingId(student.id);
    setStudentsError(null);
    try {
      const response = await fetch(`${API_BASE}/students/${student.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
      setStudents((prev) => prev.filter((row) => row.id !== student.id));
      if (editingId === student.id) {
        setEditingId(null);
      }
    } catch (error) {
      setStudentsError("Unable to delete the student.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <People color="primary" />
              <Typography variant="h6">List of DevOps Course Students</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Manage the dummy business data stored in PostgreSQL.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={loadStudents}
              disabled={studentsLoading || !!editingId}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={addStudent}
              disabled={!!editingId}
            >
              Add new student
            </Button>
          </Stack>
        </Stack>

        <Divider />

        {studentsError && (
          <Typography variant="body2" color="error">
            {studentsError}
          </Typography>
        )}

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Firstname</TableCell>
                <TableCell>Lastname</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentsLoading && (
                <TableRow>
                  <TableCell colSpan={4}>Loading students...</TableCell>
                </TableRow>
              )}
              {!studentsLoading && students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    No students yet. Add the first record.
                  </TableCell>
                </TableRow>
              )}
              {students.map((student) => {
                const isEditing = student.id === editingId;
                const busy = savingId === student.id;
                return (
                  <TableRow key={student.id} hover>
                    <TableCell onClick={() => !isEditing && startEdit(student)}>
                      {isEditing ? (
                        <TextField
                          value={draft.firstname}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              firstname: event.target.value,
                            }))
                          }
                          placeholder="Firstname"
                          fullWidth
                        />
                      ) : (
                        <Typography>{student.firstname}</Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={() => !isEditing && startEdit(student)}>
                      {isEditing ? (
                        <TextField
                          value={draft.lastname}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              lastname: event.target.value,
                            }))
                          }
                          placeholder="Lastname"
                          fullWidth
                        />
                      ) : (
                        <Typography>{student.lastname}</Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={() => !isEditing && startEdit(student)}>
                      {isEditing ? (
                        <TextField
                          type="email"
                          value={draft.email}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }))
                          }
                          placeholder="Email"
                          fullWidth
                        />
                      ) : (
                        <Typography>{student.email}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isEditing && isDirty && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Save />}
                            onClick={saveStudent}
                            disabled={!canSave || busy}
                          >
                            Save
                          </Button>
                        )}
                        {isEditing && (
                          <IconButton onClick={cancelEdit} disabled={busy}>
                            <Close />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={() => deleteStudent(student)}
                          disabled={busy}
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Paper>
  );
}
