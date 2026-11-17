import { allows } from './scope.js';

function check(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

const owner = { all: true, orgs: [] };
const member = { all: false, orgs: ['Alpha Club'] };

check(allows(owner, 'Alpha Club'), 'owner opens an association');
check(allows(owner, 'Other'), 'owner opens every association');
check(allows(owner, '  Other  '), 'owner name is trimmed');
check(!allows(owner, ''), 'blank name is refused');
check(!allows(owner, '   '), 'blank trimmed name is refused');
check(!allows(owner, 'x'.repeat(121)), 'overlong name is refused');
check(allows(owner, 'x'.repeat(120)), '120 characters is allowed for the owner');
check(allows(member, 'Alpha Club'), 'member opens their association');
check(allows(member, '  Alpha Club  '), 'member name is trimmed before the check');
check(!allows(member, 'Other'), 'member cannot open another association');
check(!allows(member, 'alpha club'), 'association name match is exact');
check(!allows({ all: false, orgs: [] }, 'Alpha Club'), 'unassigned person sees nothing');
check(!allows({ all: false }, 'Alpha Club'), 'missing association list is refused');
check(!allows(null, 'Alpha Club'), 'missing scope is refused');
check(!allows({ all: false, orgs: 'Alpha Club' }, 'Alpha Club'), 'associations must be a list');
check(!allows({ all: true }, ''), 'owner still needs an association name');

console.log('scope checks ok');
