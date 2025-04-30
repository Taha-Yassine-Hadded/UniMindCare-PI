const express = require('express');
const router = express.Router();
const Users = require('../Models/Users'); // Ajoutez cette ligne
const Case = require('../Models/Case');
const SessionNote = require('../Models/Note');
const NoteTemplate = require('../Models/noteTemplateSchema');
const mongoose = require('mongoose');
const { validateToken, authorizeRoles } = require('../middleware/authentication');

// Auth middleware for psychologists
const psychologistAuth = [validateToken, authorizeRoles('psychologue', 'psychiatre')];
// Helper to check access permission
const checkAccess = async (psychologistId, noteId) => {
    try {
      // Vérifier que les IDs sont valides
      if (!psychologistId || !noteId) {
        return { hasAccess: false, error: 'Invalid parameters', note: null };
      }
  
      // Trouver la note
      const note = await SessionNote.findById(noteId);
      if (!note) {
        return { hasAccess: false, error: 'Note not found', note: null };
      }
  
      // Vérification sécurisée de l'ID du psychologue
      const noteOwnerId = note.psychologistId ? note.psychologistId.toString() : '';
      const requesterId = psychologistId ? psychologistId.toString() : '';
      
      console.log('checkAccess:', { noteOwnerId, requesterId });
      console.log('checkAccess note:', note);
      if (!noteOwnerId || noteOwnerId !== requesterId) {
        return { hasAccess: false, error: 'Unauthorized access', note };
      }
      
      return { hasAccess: true, error: null, note };
    } catch (err) {
      console.error('Error in checkAccess:', err);
      return { hasAccess: false, error: 'Server error during authorization check', note: null };
    }
  };

// GET all templates (predefined and custom)
router.get('/templates', psychologistAuth, async (req, res) => {
  try {
    const psychologistId = req.user._id;
    
    // Get global templates and those created by this psychologist
    const templates = await NoteTemplate.find({
      $or: [
        { isGlobal: true },
        { createdBy: psychologistId }
      ]
    });
    
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      message: 'Error retrieving templates',
      error: error.message
    });
  }
});

// POST create a new template
router.post('/templates', psychologistAuth, async (req, res) => {
  try {
    const { name, type, structure, isDefault } = req.body;
    const psychologistId = req.user._id;
    
    // Check if template name already exists for this psychologist
    const existingTemplate = await NoteTemplate.findOne({
      name,
      createdBy: psychologistId
    });
    
    if (existingTemplate) {
      return res.status(400).json({ message: 'Template with this name already exists' });
    }
    
    const newTemplate = new NoteTemplate({
      name,
      type,
      structure,
      createdBy: psychologistId,
      isDefault,
      isGlobal: false // Custom templates are not global
    });
    
    const savedTemplate = await newTemplate.save();
    
    res.status(201).json({
      message: 'Template created successfully',
      template: savedTemplate
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      message: 'Error creating template',
      error: error.message
    });
  }
});

// POST create a new session note
router.post('/', psychologistAuth, async (req, res) => {
    try {
      const {
        caseId,
        appointmentId,
        studentId,
        templateType,
        title,
        objectives,
        observations,
        assessments,
        treatment,
        actions,
        followUpPlan,
        privateNotes,
        status
      } = req.body;
  
      const psychologistId = req.user._id || req.user.userId;
  
      // Validate that case exists
      const caseExists = await Case.findById(caseId);
      if (!caseExists) {
        return res.status(404).json({ message: 'Case not found' });
      }
  
      // Check if psychologist is authorized for this case
      // CORRECTION: Vérifier d'abord que psychologistId existe dans le cas
      if (caseExists.psychologistId && caseExists.psychologistId.toString) {
        if (caseExists.psychologistId.toString() !== psychologistId.toString()) {
          return res.status(403).json({ message: 'Not authorized for this case' });
        }
      } else if (caseExists.psychologistId) {
        // Si psychologistId existe mais n'a pas de méthode toString()
        if (caseExists.psychologistId !== psychologistId) {
          return res.status(403).json({ message: 'Not authorized for this case' });
        }
      }
      // Si le cas n'a pas de psychologue assigné, on considère que c'est autorisé
  
      // Create new session note
      const newNote = new SessionNote({
        caseId,
        appointmentId,
        psychologistId,
        studentId,
        templateType: templateType || 'standard',
        title,
        objectives,
        observations,
        assessments,
        treatment,
        actions,
        followUpPlan,
        privateNotes,
        status: status || 'draft'
      });

    const savedNote = await newNote.save();

    // Add note reference to the case
    await Case.findByIdAndUpdate(caseId, {
      $push: { sessionNotes: savedNote._id }
    });
    
    // Populate necessary fields for response
    const populatedNote = await SessionNote.findById(savedNote._id)
      .populate('psychologistId', 'Name Role')
      .populate('studentId', 'Name');
    
    res.status(201).json({
      message: 'Session note created successfully',
      note: populatedNote
    });

  } catch (error) {
    console.error('Error creating session note:', error);
    res.status(500).json({
      message: 'Error creating session note',
      error: error.message
    });
  }
});

// GET a specific session note by ID - Corrected version
router.get('/:id', psychologistAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const psychologistId = req.user._id || req.user.userId; // Récupération sécurisée de l'ID
      
      // Vérification préliminaire
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid note ID format' });
      }
      
      // Check access permission
      const { hasAccess, error, note } = await checkAccess(psychologistId, id);
      if (!hasAccess) {
        return res.status(403).json({ message: error });
      }
      
      // Au lieu de faire une nouvelle requête, utilisons la note déjà récupérée par checkAccess
      // et populons simplement ce qui est nécessaire
      const populatedNote = await SessionNote.findById(id)
        .populate('caseId')
        .populate('appointmentId');
  
      if (!populatedNote) {
        return res.status(404).json({ message: 'Note not found' });
      }
      
      // Contournement pour éviter les erreurs de modèle non enregistré
      // Construire manuellement la réponse
      const response = {
        ...populatedNote.toObject(),
        psychologistId: note.psychologistId, // On utilise les données déjà récupérées
        studentId: note.studentId           // On utilise les données déjà récupérées
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting session note:', error);
      res.status(500).json({
        message: 'Error retrieving session note',
        error: error.message
      });
    }
  });

// PUT update an existing session note
router.put('/:id', psychologistAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Récupération sécurisée de l'ID utilisateur
      const psychologistId = req.user._id || req.user.userId;
      
      // Vérification de base de l'ID de la note
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid note ID format' });
      }
      
      // Vérifier directement si la note existe et appartient à ce psychologue
      const note = await SessionNote.findOne({
        _id: id,
        psychologistId: psychologistId
      });
      
      if (!note) {
        return res.status(404).json({ message: 'Note not found or unauthorized access' });
      }
      
      const updates = req.body;
      
      // Only allow updating specific fields
      const allowedUpdates = [
        'title', 'objectives', 'observations', 
        'assessments', 'treatment', 'actions', 
        'followUpPlan', 'privateNotes', 'status'
      ];
      
      const updateData = {};
      for (const field of allowedUpdates) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }
      
      // Mettre à jour la note
      note.set(updateData);
      await note.save();
      
      // Retourner la note mise à jour sans populate pour éviter les erreurs de modèle
      res.status(200).json({
        message: 'Session note updated successfully',
        note: note
      });
    } catch (error) {
      console.error('Error updating session note:', error);
      res.status(500).json({
        message: 'Error updating session note',
        error: error.message
      });
    }
  });

// GET all session notes for a specific case
router.get('/case/:caseId', psychologistAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    // Check if case exists and belongs to this psychologist
    const caseData = await Case.findOne({
      _id: caseId,
      psychologistId: psychologistId
    });
    
    if (!caseData) {
      return res.status(404).json({ message: 'Case not found or unauthorized access' });
    }
    
    const sessionNotes = await SessionNote.find({
      caseId,
      psychologistId,
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .populate('appointmentId', 'date status')
    .populate('studentId', 'Name');
    
    res.status(200).json(sessionNotes);
  } catch (error) {
    console.error('Error getting session notes by case:', error);
    res.status(500).json({
      message: 'Error retrieving session notes',
      error: error.message
    });
  }
});

// DELETE (soft delete) a session note
router.delete('/:id', psychologistAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const psychologistId = req.user._id || req.user.userId;
    
    // Check access permission
    const { hasAccess, error } = await checkAccess(psychologistId, id);
    if (!hasAccess) {
      return res.status(403).json({ message: error });
    }
    
    // Soft delete by setting isDeleted flag
    await SessionNote.findByIdAndUpdate(id, { isDeleted: true });
    
    res.status(200).json({ message: 'Session note deleted successfully' });
  } catch (error) {
    console.error('Error deleting session note:', error);
    res.status(500).json({
      message: 'Error deleting session note',
      error: error.message
    });
  }
});

// Initialize default templates function
const initializeDefaultTemplates = async () => {
  try {
    // Check if default templates already exist
    const templatesCount = await NoteTemplate.countDocuments({ isGlobal: true });
    if (templatesCount > 0) {
      console.log('Default templates already exist');
      return;
    }

    console.log('Creating default note templates...');

    const defaultTemplates = [
      {
        name: 'Standard Session',
        type: 'standard',
        structure: {
          objectives: {
            label: 'Session Objectives',
            placeholder: 'What were the goals for this session?',
            required: true,
            defaultValue: ''
          },
          observations: {
            label: 'Observations',
            placeholder: 'What did you observe during the session?',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Assessments',
            placeholder: 'Any assessments conducted or results discussed?',
            required: false,
            defaultValue: ''
          },
          treatment: {
            label: 'Treatment Approaches',
            placeholder: 'What therapeutic approaches were used?',
            required: false,
            defaultValue: ''
          },
          actions: {
            label: 'Recommended Actions',
            placeholder: 'What actions were recommended to the student?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Plan',
            placeholder: 'What is the plan for the next session?',
            required: false,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Initial Assessment',
        type: 'initial_assessment',
        structure: {
          objectives: {
            label: 'Assessment Goals',
            placeholder: 'What is the purpose of this initial assessment?',
            required: true,
            defaultValue: 'To assess the student\'s mental health needs and establish a baseline for treatment.'
          },
          observations: {
            label: 'Client History & Present Concerns',
            placeholder: 'Document the client\'s history and current presenting issues',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Assessment Tools Used',
            placeholder: 'What assessment tools or questionnaires were administered?',
            required: true,
            defaultValue: ''
          },
          treatment: {
            label: 'Proposed Treatment Plan',
            placeholder: 'What is the initial treatment plan?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'Immediate Recommendations',
            placeholder: 'What immediate actions or recommendations were provided?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Schedule',
            placeholder: 'What is the recommended follow-up schedule?',
            required: true,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Crisis Intervention',
        type: 'crisis_intervention',
        structure: {
          objectives: {
            label: 'Crisis Description',
            placeholder: 'Describe the nature of the crisis',
            required: true,
            defaultValue: ''
          },
          observations: {
            label: 'Risk Assessment',
            placeholder: 'Document the risk assessment conducted',
            required: true,
            defaultValue: 'Safety assessment conducted. Risk level:'
          },
          assessments: {
            label: 'Current Mental State',
            placeholder: 'Document the client\'s current mental state',
            required: true,
            defaultValue: ''
          },
          treatment: {
            label: 'Intervention Details',
            placeholder: 'What crisis intervention techniques were used?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'Safety Planning',
            placeholder: 'What safety planning was implemented?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Follow-up Protocol',
            placeholder: 'What is the crisis follow-up protocol?',
            required: true,
            defaultValue: 'Follow-up scheduled within 24-48 hours.'
          }
        },
        isDefault: true,
        isGlobal: true
      },
      {
        name: 'Progress Update',
        type: 'progress_update',
        structure: {
          objectives: {
            label: 'Progress Review Goals',
            placeholder: 'What aspects of progress are being reviewed?',
            required: true,
            defaultValue: 'To evaluate progress toward treatment goals and adjust plan if needed.'
          },
          observations: {
            label: 'Progress Since Last Session',
            placeholder: 'What progress has been made since the last session?',
            required: true,
            defaultValue: ''
          },
          assessments: {
            label: 'Updated Assessment',
            placeholder: 'Any new assessment results or changes in scores?',
            required: false,
            defaultValue: ''
          },
          treatment: {
            label: 'Treatment Plan Adjustments',
            placeholder: 'What adjustments are needed to the treatment plan?',
            required: true,
            defaultValue: ''
          },
          actions: {
            label: 'New Recommended Actions',
            placeholder: 'What new actions are recommended?',
            required: true,
            defaultValue: ''
          },
          followUpPlan: {
            label: 'Next Steps',
            placeholder: 'What are the next steps in treatment?',
            required: true,
            defaultValue: ''
          }
        },
        isDefault: true,
        isGlobal: true
      }
    ];

    await NoteTemplate.insertMany(defaultTemplates);
    console.log('Default templates created successfully');
  } catch (error) {
    console.error('Error initializing default templates:', error);
  }
};

// Export the initialization function to be called when server starts
module.exports.initializeDefaultTemplates = initializeDefaultTemplates;
module.exports.router = router;