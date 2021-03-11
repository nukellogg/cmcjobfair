/* eslint-disable */
import computeMunkres from 'munkres-js'
import underscore from 'underscore'

const _ = underscore

const jobFairOptions = {
  MAX_ITERATIONS: 100,
  // Neither of these divider tokens should show up in the Rep names or the
  // company names.
  // what goes between 'Rep A' and '12:15 - 12:30' in the time slot,
  // as in 'Rep A@12:15 - 12:30'
  repTimeSlotDivider: '@',
  // what goes between 'Company A' and 'Rep A@12:15 - 12:30' in the time slot,
  // as in 'Company A: Rep A@12:15 - 12:30'
  companyRepDivider: ': '
}


function parseTimeSlotName(timeSlotName) {
  let [companyAndRep, timeSlot] = timeSlotName.split(jobFairOptions.repTimeSlotDivider);
  let [company, rep] = companyAndRep.split(jobFairOptions.companyRepDivider);
  return {
    company,
    rep,
    timeSlot
  };
}

/*

        88               88
        88               88
        88               88
        88   ,adPPYba,   88,dPPYba,
        88  a8"     "8a  88P'    "8a
        88  8b       d8  88       d8
88,   ,d88  "8a,   ,a8"  88b,   ,a8"
 "Y8888P"    `"YbbdP"'   8Y"Ybbd8"'



88888888888          88
88                   ""
88
88aaaaa  ,adPPYYba,  88  8b,dPPYba,
88"""""  ""     `Y8  88  88P'   "Y8
88       ,adPPPPP88  88  88
88       88,    ,88  88  88
88       `"8bbdP"Y8  88  88


*/
function computeAssignmentsJobFair(self, {
  companies,
  students,
  rankings,
  scheduleSlots,
  maxIterations = jobFairOptions.MAX_ITERATIONS
}) {
  var iterations = 0;
  do {
    self.postMessage({
      mutation: 'SET_ITERATION_JOBFAIR',
      payload: iterations
    })
/*
  ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗   ██╗████████╗███████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║   ██║╚══██╔══╝██╔════╝
██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║   ██║   █████╗
██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║   ██║   ██╔══╝
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝   ██║   ███████╗
  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝    ╚═╝   ╚══════╝
*/
    self.postMessage({
      mutation: 'LOG_STATUS_JOBFAIR',
      payload: `⏱  Computing assignments (ITERATION ${iterations})...`
    });
    var assignments = [];
    for (var i = 0; i < companies.length; i++) {
      var company = companies[i];
      // The ith column of the rankings matrix corresponds to the ith company
      var rankingsForThisCompany = rankings.map(row => row[i]);
      // Each of the timeslots for the company will look like:
      // Company A: Rep A@12:15 - 12:30
      var companyScheduleSlots = scheduleSlots.map(s => company + jobFairOptions.companyRepDivider + s);
      // Let's make a new rankings matrix:
      // columns - the scheduled timeslots available for this company
      // rows - the students' rankings of this particular company, replicated
      //        to each of the timeslots identically.
      var companySlotRankings = rankingsForThisCompany.map(r => Array(companyScheduleSlots.length).fill(r));
      // self.postMessage({
      //   mutation: 'LOG_STATUS',
      //   payload: `🤖  Calculating assignments for company ${i + 1} / ${companies.length}: ${company}`
      // });
      var companyAssignments = computeMunkres(companySlotRankings).map(assignment => {
        let [row, col] = assignment;
        return {
          student: students[row],
          timeSlotString: companyScheduleSlots[col],
          ranking: companySlotRankings[row][col]
        };
      });
      assignments = assignments.concat(companyAssignments);
    }

/*
 ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗
██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝
██║     ███████║█████╗  ██║     █████╔╝
██║     ██╔══██║██╔══╝  ██║     ██╔═██╗
╚██████╗██║  ██║███████╗╚██████╗██║  ██╗
 ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝

 ██████╗ ██████╗ ███╗   ██╗███████╗██╗     ██╗ ██████╗████████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██║     ██║██╔════╝╚══██╔══╝
██║     ██║   ██║██╔██╗ ██║█████╗  ██║     ██║██║        ██║
██║     ██║   ██║██║╚██╗██║██╔══╝  ██║     ██║██║        ██║
╚██████╗╚██████╔╝██║ ╚████║██║     ███████╗██║╚██████╗   ██║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚══════╝╚═╝ ╚═════╝   ╚═╝
*/
    self.postMessage({
      mutation: 'LOG_STATUS_JOBFAIR',
      payload: "⏱  Checking for scheduling conflicts..."
    });
    /**
     * This will be a data structure indicating the list of assignments
     * each student has keyed by the real time slot (e.g. "12:15 - 12:30").
     * If the list of assignments for a given time slot has length greater
     * than 1, then that's a conflict. This also helps with outputting to
     * the web, where we'd probably want the schedule broken down by student
     * first, then time slot, then what's happening at that time.
     * The data structure might look like:
     * stsa = {
     *   'Student 1': {
     *     '12:15 - 12:30': [
     *       {
     *         company: 'Company A',
     *         rep: 'Rep A',
     *         ranking: 1
     *       },
     *       {
     *         company: 'Company B',
     *         rep: 'Rep A',
     *         ranking: 2
     *       }
     *     ]
     *   }
     * }
     */
    var stsa = {}
    /**
     * This is what we'll output to a file or similar, this is simply
     * keyed by student and then a list of timeslots, companies, reps, and
     * corresponding rankings of those companies by that student. This is
     * easier to parse for displaying on a web page, but not as easy to
     * use for checking for duplicates as the stsa data structure.
     * outputData = {
     *   'Student 1': [
     *     {
     *       timeSlot: '12:15 - 12:30',
     *       company: 'Company A',
     *       rep: 'Rep A',
     *       ranking: 1
     *     },
     *     {
     *       timeSlot: '12:15 - 12:30',
     *       company: 'Company B',
     *       rep: 'Rep A',
     *       ranking: 2
     *     }
     *   ],
     * }
     */
    var outputData = {}
    /**
     * This will simply be a list of objects showing the students who have
     * conflicts and in what timeslot, to help address within stsa later.
     * conflicts = [
     *   {
     *     student: 'Student 1',
     *     timeSlot: '12:15 - 12:30'
     *   },
     * ]
     */
    var conflicts = []
    for (var i = 0; i < assignments.length; i++) {
      var { student, timeSlotString, ranking } = assignments[i]
      var { company, rep, timeSlot } = parseTimeSlotName(timeSlotString)

      var stsaEntry = { company, rep, ranking }
      if (student in stsa) {
        if (timeSlot in stsa[student]) {
          // Since this timeslot has already been initialized, there's now a
          // scheduling conflict.
          conflicts.push({ student, timeSlot })
          stsa[student][timeSlot].push(stsaEntry)
        } else {
          // Initialize timeSlot
          stsa[student][timeSlot] = [stsaEntry]
        }
      } else {
        // Initialize student and timeSlot
        stsa[student] = {}
        stsa[student][timeSlot] = [stsaEntry]
      }

      var outputEntry = { timeSlot, company, rep, ranking }
      if (student in outputData) {
        outputData[student].push(outputEntry)
      } else {
        // Initialize student
        outputData[student] = [outputEntry]
      }
    }
    // Sort the output data so that timeslots are in order for each student
    for (var student in outputData) {
      outputData[student] = _.sortBy(outputData[student], 'timeSlot')
    }

/*
██╗      ██████╗  ██████╗
██║     ██╔═══██╗██╔════╝
██║     ██║   ██║██║  ███╗
██║     ██║   ██║██║   ██║
███████╗╚██████╔╝╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝

███████╗████████╗ █████╗ ████████╗███████╗
██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝
███████╗   ██║   ███████║   ██║   ███████╗
╚════██║   ██║   ██╔══██║   ██║   ╚════██║
███████║   ██║   ██║  ██║   ██║   ███████║
╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
*/
    var totalCost = _.reduce(_.pluck(assignments, 'ranking'), (a, b) => a + b, 0)
    var studentsWithAssignments = Object.keys(stsa)
    var avgSatisfaction = totalCost / studentsWithAssignments.length
    self.postMessage({
      mutation: 'LOG_STATUS_JOBFAIR',
      payload: `🧮 Total cost of ${totalCost}, working out to ${avgSatisfaction} average ranking of assigned companies (lower is better).`
    })

    var worstRanking = _.max(_.pluck(assignments, 'ranking'))
    var worstRankingCount = assignments.filter(a => a.ranking === worstRanking).length
    self.postMessage({
      mutation: 'LOG_STATUS_JOBFAIR',
      payload: `👎 The worst ranking among the assignments is ${worstRanking}, for ${worstRankingCount} student(s).`
    })

    var nonAssignedStudents = _.difference(students, studentsWithAssignments)
    if (nonAssignedStudents.length > 0) {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: `😭 There are ${nonAssignedStudents.length} students without assignments:`
      })
      nonAssignedStudents.map(student => {
        self.postMessage({
          mutation: 'LOG_STATUS_JOBFAIR',
          payload: `😭 ${nonAssignedStudents.indexOf(student) + 1}. ${student}`
        })
      })
    } else {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: "🎉 Yippee! All students are scheduled for at least one thing!"
      })
    }

    if (conflicts.length === 0) {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: "🎉 Yippee! There are no scheduling conflicts!"
      })
    } else {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: `⛔️ ${conflicts.length} Scheduling Conflicts:`
      })
      conflicts.map(({ student, timeSlot }) => {
        var events = stsa[student][timeSlot]
        self.postMessage({
          mutation: 'LOG_STATUS_JOBFAIR',
          payload: `⛔️ ${events.length} events scheduled for ${student} at ${timeSlot}.`
        })
      })
    }

/*
 ██████╗ ██╗   ██╗████████╗██████╗ ██╗   ██╗████████╗
██╔═══██╗██║   ██║╚══██╔══╝██╔══██╗██║   ██║╚══██╔══╝
██║   ██║██║   ██║   ██║   ██████╔╝██║   ██║   ██║
██║   ██║██║   ██║   ██║   ██╔═══╝ ██║   ██║   ██║
╚██████╔╝╚██████╔╝   ██║   ██║     ╚██████╔╝   ██║
 ╚═════╝  ╚═════╝    ╚═╝   ╚═╝      ╚═════╝    ╚═╝

 █████╗ ███████╗███████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝██║██╔════╝ ████╗  ██║██╔════╝
███████║███████╗███████╗██║██║  ███╗██╔██╗ ██║███████╗
██╔══██║╚════██║╚════██║██║██║   ██║██║╚██╗██║╚════██║
██║  ██║███████║███████║██║╚██████╔╝██║ ╚████║███████║
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
*/
    // Preparing this as a list of lists for easy conversion to CSV for download
    var unpackedOutputData = [["Student", "Time Slot", "Company", "Rep", "Ranking"]]
    for (var student in outputData) {
      for (var i in outputData[student]) {
        var { timeSlot, company, rep, ranking } = outputData[student][i]
        unpackedOutputData.push([student, timeSlot, company, rep, ranking])
      }
    }

    self.postMessage({
      mutation: 'STORE_ASSIGNMENTS_JOBFAIR',
      payload: {
        // iteration: iterations,
        avgSatisfaction,
        conflicts,
        nonAssignedStudents,
        assignments: outputData,
        assignmentsList: unpackedOutputData
      }
    })

/*
 █████╗ ██████╗      ██╗██╗   ██╗███████╗████████╗
██╔══██╗██╔══██╗     ██║██║   ██║██╔════╝╚══██╔══╝
███████║██║  ██║     ██║██║   ██║███████╗   ██║
██╔══██║██║  ██║██   ██║██║   ██║╚════██║   ██║
██║  ██║██████╔╝╚█████╔╝╚██████╔╝███████║   ██║
╚═╝  ╚═╝╚═════╝  ╚════╝  ╚═════╝ ╚══════╝   ╚═╝

 ██████╗ ██████╗ ███╗   ██╗███████╗██╗     ██╗ ██████╗████████╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝██║     ██║██╔════╝╚══██╔══╝██╔════╝
██║     ██║   ██║██╔██╗ ██║█████╗  ██║     ██║██║        ██║   ███████╗
██║     ██║   ██║██║╚██╗██║██╔══╝  ██║     ██║██║        ██║   ╚════██║
╚██████╗╚██████╔╝██║ ╚████║██║     ███████╗██║╚██████╗   ██║   ███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚══════╝╚═╝ ╚═════╝   ╚═╝   ╚══════╝
*/
    if (conflicts.length > 0) {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: `🤖 De-ranking less preferable assignments for students with conflicts, in the hope that this will eliminate their assignment the next go-round.`
      })
      conflicts.map(({ student, timeSlot }) => {
        // For each list of conflicting events, find the one with the lowest
        // ranking (i.e. most preferable), ignore it, and just change rankings
        // for the other events.
        var events = stsa[student][timeSlot]
        _.sortBy(events, 'ranking')
          .slice(1, events.length)
          .map(({ company }) => {
            var studentIndex = students.indexOf(student)
            var companyIndex = companies.indexOf(company)
            rankings[studentIndex][companyIndex] += 1
          })
      })
    }

/*
 █████╗ ██████╗      ██╗██╗   ██╗███████╗████████╗
██╔══██╗██╔══██╗     ██║██║   ██║██╔════╝╚══██╔══╝
███████║██║  ██║     ██║██║   ██║███████╗   ██║
██╔══██║██║  ██║██   ██║██║   ██║╚════██║   ██║
██║  ██║██████╔╝╚█████╔╝╚██████╔╝███████║   ██║
╚═╝  ╚═╝╚═════╝  ╚════╝  ╚═════╝ ╚══════╝   ╚═╝

███╗   ██╗ ██████╗        █████╗ ███████╗███████╗██╗ ██████╗ ███╗   ██╗
████╗  ██║██╔═══██╗      ██╔══██╗██╔════╝██╔════╝██║██╔════╝ ████╗  ██║
██╔██╗ ██║██║   ██║█████╗███████║███████╗███████╗██║██║  ███╗██╔██╗ ██║
██║╚██╗██║██║   ██║╚════╝██╔══██║╚════██║╚════██║██║██║   ██║██║╚██╗██║
██║ ╚████║╚██████╔╝      ██║  ██║███████║███████║██║╚██████╔╝██║ ╚████║
╚═╝  ╚═══╝ ╚═════╝       ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
*/
    if (nonAssignedStudents.length > 0) {
      self.postMessage({
        mutation: 'LOG_STATUS_JOBFAIR',
        payload: `🤖  We still have ${nonAssignedStudents.length} students without assignments. Let's de-prioritize the lesser-rated assignments for students with more than one assigned event.`
      })

      var histogram = {}
      var multiples = []
      for (var student in stsa) {
        var times = Object.keys(stsa[student])
        if (times.length > 1) {
          multiples.push(student)
          histogram[times.length] = (times.length in histogram) ? histogram[times.length] + 1 : 1
        }
      }

      for (var count in histogram) {
        self.postMessage({
          mutation: 'LOG_STATUS_JOBFAIR',
          payload: `🦑 ${histogram[count]} students have ${count} assignments.`
        })
      }

      multiples.map(student => {
        var events = []
        for (var timeslot in stsa[student]) {
          events = events.concat(stsa[student][timeslot])
        }
        _.sortBy(events, 'ranking')
          .slice(1, events.length)
          .map(({ company }) => {
            var studentIndex = students.indexOf(student)
            var companyIndex = companies.indexOf(company)
            rankings[studentIndex][companyIndex] += 1
          })
      })
    }

    iterations++
  } while (iterations < maxIterations
    && (conflicts.length > 0 || nonAssignedStudents.length > 0)
  );
}

/*

 ad88888ba   88                                   88
d8"     "8b  ""                                   88
Y8,                                               88
`Y8aaaaa,    88  88,dPYba,,adPYba,   8b,dPPYba,   88   ,adPPYba,
  `"""""8b,  88  88P'   "88"    "8a  88P'    "8a  88  a8P_____88
        `8b  88  88      88      88  88       d8  88  8PP"""""""
Y8a     a8P  88  88      88      88  88b,   ,a8"  88  "8b,   ,aa
 "Y88888P"   88  88      88      88  88`YbbdP"'   88   `"Ybbd8"'
                                     88
                                     88
*/
function computeAssignmentsSimple(self, {
  companies,
  students,
  rankings
}) {
/*
 ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗   ██╗████████╗███████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║   ██║╚══██╔══╝██╔════╝
██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║   ██║   █████╗
██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║   ██║   ██╔══╝
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝   ██║   ███████╗
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝    ╚═╝   ╚══════╝

*/
  let assignments = computeMunkres(rankings)
    .map(assignment => {
      let [row, col] = assignment;
      return {
        student: students[row],
        company: companies[col],
        ranking: rankings[row][col]
      }
    })

/*
 ██████╗ █████╗ ██╗      ██████╗
██╔════╝██╔══██╗██║     ██╔════╝
██║     ███████║██║     ██║
██║     ██╔══██║██║     ██║
╚██████╗██║  ██║███████╗╚██████╗
 ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝

███████╗████████╗ █████╗ ████████╗███████╗
██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝
███████╗   ██║   ███████║   ██║   ███████╗
╚════██║   ██║   ██╔══██║   ██║   ╚════██║
███████║   ██║   ██║  ██║   ██║   ███████║
╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
*/

  let totalCost = _.reduce(_.pluck(assignments, 'ranking'), (a, b) => a + b, 0);
  let avgSatisfaction = totalCost / students.length;

/*
 ██████╗ ██╗   ██╗████████╗██████╗ ██╗   ██╗████████╗
██╔═══██╗██║   ██║╚══██╔══╝██╔══██╗██║   ██║╚══██╔══╝
██║   ██║██║   ██║   ██║   ██████╔╝██║   ██║   ██║
██║   ██║██║   ██║   ██║   ██╔═══╝ ██║   ██║   ██║
╚██████╔╝╚██████╔╝   ██║   ██║     ╚██████╔╝   ██║
 ╚═════╝  ╚═════╝    ╚═╝   ╚═╝      ╚═════╝    ╚═╝

 █████╗ ███████╗███████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝██║██╔════╝ ████╗  ██║██╔════╝
███████║███████╗███████╗██║██║  ███╗██╔██╗ ██║███████╗
██╔══██║╚════██║╚════██║██║██║   ██║██║╚██╗██║╚════██║
██║  ██║███████║███████║██║╚██████╔╝██║ ╚████║███████║
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
*/

  self.postMessage({
    mutation: 'STORE_ASSIGNMENTS_SIMPLE',
    payload: {
      assignments,
      avgSatisfaction
    }
  })
}

onmessage = e => {
  const {
    action,
    payload
  } = e.data;
  switch (action) {
    case 'computeAssignmentsJobFair':
      self.postMessage({
        mutation: 'SET_WORKING_JOBFAIR',
        payload: true
      });
      computeAssignmentsJobFair(self, payload);
      self.postMessage({
        mutation: 'SET_WORKING_JOBFAIR',
        payload: false
      });
      break;
    case 'computeAssignmentsSimple':
      self.postMessage({
        mutation: 'SET_WORKING_SIMPLE',
        payload: true
      });
      computeAssignmentsSimple(self, payload);
      self.postMessage({
        mutation: 'SET_WORKING_SIMPLE',
        payload: false
      });
      break;
  }
};
