
function joinRoles(roleList, roleNames) {
    return roleList.map(role => roleNames[role]).join('/');
}

function getPersonsInfo(data) {
    const personInfo = data.persons
        .filter(person => person.registration !== null)
        .map(person => {
            const roleList = person.roles;
            let role = '';
            const roleNames = {
                'delegate': 'DELEGATE',
                'organizer': 'ORGANIZER',
                'trainee-delegate': 'TRAINEE-DELEGATE',
                'staff-dataentry': 'STAFF',
                'staff-other': 'STAFF',
                'staff-judge': 'STAFF',
                'staff-scrambler': 'STAFF',
                'staff-runner': 'STAFF'
            }
            if (roleList.length == 0) role = 'COMPETITOR';
            else if (roleList.length == 1) role = roleNames[roleList[0]];
            else if (roleList.length > 1) role = roleList.map(role => roleNames[role]).join('/');
            if (role.split('/').includes('STAFF')) role = 'STAFF';
            return {
                name: person.name,
                wcaId: person.wcaId,
                registrantId: person.registrantId,
                assignments: person.assignments || [],
                region: person.countryIso2,
                role: role
            };
        });

    const allActivities = {};
    data.schedule.venues.forEach(venue => {
        venue.rooms.forEach(room => {
            room.activities.forEach(activity => {
                allActivities[activity.id] = {
                    name: activity.name,
                    activityCode: activity.activityCode,
                    room: room.name
                };
                activity.childActivities.forEach(child => {
                    allActivities[child.id] = {
                        name: child.name,
                        activityCode: child.activityCode,
                        room: room.name
                    };
                });
            });
        });
    });

    personInfo.forEach(person => {
        person.assignments.forEach(assignment => {
            const activity = assignment.activityId;
            assignment.activityCode = allActivities[activity]?.activityCode || '';
            assignment.room = allActivities[activity]?.room || '';
        });
    });

    const events = data.events.map(event => event.id);

    return { personInfo, events };
}

function dataToBadges({ personInfo, events }, type) {
    const multipleRooms = document.getElementById("multiple_rooms") && document.getElementById("multiple_rooms").checked;

    if (type == 'csv') {
        separator = ',';
    } else if (type == 'tsv') {
        separator = '\t';
    } else {
        separator = '\t';
    }
    let finalTSV = `name${separator}wcaID${separator}region${separator}registrantId${separator}role`;

    events.forEach(event => {
        finalTSV += `${separator}${event}-tasks${separator}${event}-comp`;
    });

    personInfo.forEach(person => {
        const name = person.name;
        const wcaId = person.wcaId || 'NEWCOMER';
        const registrantId = String(person.registrantId);
        const region = countryCodes[person.region];
        const role = person.role;
        const allEvents = {};

        events.forEach(event => {
            let comp = '';
            let tasks = [];

            person.assignments.forEach(assignment => {
                let task_name = '';
                const [eventCode] = assignment.activityCode?.split('-') || [''];
                if (eventCode === event) {
                    const round = assignment.activityCode?.split('-')[1]?.slice(1) || '';
                    if (round === '1') {
                        const detail = assignment.activityCode?.split('-')[2]?.slice(1) || '';
                        if (assignment.assignmentCode === 'competitor') {
                            if (!multipleRooms) {
                                comp = detail;
                            } else {
                                comp = detail + assignment.room[0].toUpperCase();
                            }
                        }
                        if (assignment.assignmentCode === 'staff-dataentry') {
                            task_name = 'E' + detail;
                            if (multipleRooms) {
                                task_name += '-' + assignment.room[0].toUpperCase();
                            }
                        }
                        if (['staff-runner', 'staff-judge', 'staff-scrambler', 'staff-delegate'].includes(assignment.assignmentCode)) {
                            task_name = assignment.assignmentCode.split('-')[1][0].toUpperCase() + detail;
                            if (multipleRooms) {
                                task_name += '-' + assignment.room[0].toUpperCase();
                            }
                        }
                        if (task_name) {
                            tasks.push(task_name);
                        }
                    }
                }
            });

            tasks.sort((a, b) => a[1].localeCompare(b[1]));

            let taskStr = tasks.length ? tasks.join(',') : '';

            // Wrap with double quotes **only if** it contains a comma or a quote
            if (taskStr.includes(',') || taskStr.includes('"')) {
                taskStr = `"${taskStr.replace(/"/g, '""')}"`;  // escape inner quotes by doubling them
            }

            allEvents[event] = {
                tasks: taskStr,
                comp: comp
            };
        });

        finalTSV += `\n${name}${separator}${wcaId}${separator}${region}${separator}${registrantId}${separator}${role}`;
        events.forEach(event => {
            finalTSV += `${separator}${allEvents[event].tasks}${separator}${allEvents[event].comp}`;
        });
    });
    const addPlaceholder = document.getElementById("addPlaceholder");
    if (addPlaceholder && addPlaceholder.checked) {
        finalTSV += `\nEXTRANAME,,,,VOLUNTEER`;
        events.forEach(() => {
            finalTSV += `${separator}${separator}`;
        });
    }

    return finalTSV;
}
